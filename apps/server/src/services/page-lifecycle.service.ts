import type { DatabaseClient } from "@grabbin/db";
import { creemSubscription, pages, user } from "@grabbin/db/schema/index";
import { isReservedPageHandle } from "@grabbin/page-handle";
import { getPlanAccess, PAGE_GRACE_PERIOD_MS } from "@grabbin/plan";
import { and, asc, eq, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";

import { PageServiceError } from "../exceptions/page.exception";
import { getAccountPlan } from "./billing.service";

async function lockUser(
	tx: Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0],
	userId: string,
) {
	await tx.execute(sql`select id from "user" where id = ${userId} for update`);
}

export async function assertPageWritable({
	db,
	userId,
	page,
	proProductIds = [],
	now = new Date(),
}: {
	db: DatabaseClient;
	userId: string;
	page: { id: string; handle?: string };
	proProductIds?: readonly string[];
	now?: Date;
}) {
	const [plan, owner] = await Promise.all([
		getAccountPlan({ db, userId, proProductIds, now }),
		db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { primaryPageHandle: true },
		}),
	]);
	if (plan.hasAccess || owner?.primaryPageHandle === page.handle) return;
	throw new PageServiceError("PAGE_READ_ONLY");
}

export async function listOwnedPages({
	db,
	userId,
	proProductIds = [],
}: {
	db: DatabaseClient;
	userId: string;
	proProductIds?: readonly string[];
}) {
	const [ownedPages, owner, plan] = await Promise.all([
		db.query.pages.findMany({
			where: eq(pages.userId, userId),
			columns: {
				id: true,
				handle: true,
				name: true,
				imageKey: true,
				deletionScheduledAt: true,
			},
		}),
		db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: { primaryPageHandle: true },
		}),
		getAccountPlan({ db, userId, proProductIds }),
	]);
	return {
		pages: ownedPages
			.map((page) => ({
				...page,
				isPrimary: page.handle === owner?.primaryPageHandle,
			}))
			.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
		plan: {
			tier: plan.tier,
			pageLimit: plan.pageLimit,
			hasAccess: plan.hasAccess,
			periodEnd: plan.periodEnd?.toISOString() ?? null,
		},
	};
}

export async function listSitemapHandles(db: DatabaseClient) {
	const pagesForSitemap = await db.query.pages.findMany({
		where: and(eq(pages.onboarding, true), isNull(pages.deletionScheduledAt)),
		columns: { handle: true },
		orderBy: asc(pages.handle),
	});
	return pagesForSitemap
		.map(({ handle }) => handle)
		.filter((handle) => !isReservedPageHandle(handle));
}

export async function changePrimaryPage({
	db,
	userId,
	handle,
	proProductIds = [],
}: {
	db: DatabaseClient;
	userId: string;
	handle: string;
	proProductIds?: readonly string[];
}) {
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const plan = await getAccountPlan({ db: tx, userId, proProductIds });
		if (!plan.hasAccess) throw new PageServiceError("PRO_REQUIRED");
		const page = await tx.query.pages.findFirst({
			where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
			columns: { id: true, handle: true },
		});
		if (!page) throw new PageServiceError("PAGE_NOT_FOUND");
		await tx
			.update(user)
			.set({ primaryPageHandle: page.handle })
			.where(eq(user.id, userId));
		await tx
			.update(pages)
			.set({ deletionScheduledAt: null })
			.where(eq(pages.userId, userId));
		return page;
	});
}

async function deletePageMedia(bucket: R2Bucket, prefix: string) {
	let cursor: string | undefined;
	do {
		const result = await bucket.list({ prefix, cursor, limit: 1000 });
		await Promise.all(
			result.objects.map((object) => bucket.delete(object.key)),
		);
		cursor = result.truncated ? result.cursor : undefined;
	} while (cursor);
}

export async function deleteOwnedPage({
	db,
	bucket,
	userId,
	handle,
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	userId: string;
	handle: string;
}) {
	const page = await db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const [currentUser, ownedPage] = await Promise.all([
			tx.query.user.findFirst({
				where: eq(user.id, userId),
				columns: { primaryPageHandle: true },
			}),
			tx.query.pages.findFirst({
				where: and(eq(pages.handle, handle), eq(pages.userId, userId)),
				columns: { id: true, handle: true },
			}),
		]);
		if (!ownedPage) throw new PageServiceError("PAGE_NOT_FOUND");
		if (currentUser?.primaryPageHandle === ownedPage.handle) {
			throw new PageServiceError("PRIMARY_PAGE_CANNOT_DELETE");
		}
		const [deleted] = await tx
			.delete(pages)
			.where(and(eq(pages.id, ownedPage.id), eq(pages.userId, userId)))
			.returning({ id: pages.id });
		return deleted;
	});
	if (!page) throw new PageServiceError("PAGE_NOT_FOUND");
	await deletePageMedia(bucket, `users/${userId}/pages/${page.id}/`);
}

export async function reconcileUserPageLifecycle({
	db,
	userId,
	proProductIds,
	now = new Date(),
}: {
	db: DatabaseClient;
	userId: string;
	proProductIds: readonly string[];
	now?: Date;
}) {
	await db.transaction(async (tx) => {
		await lockUser(tx, userId);
		const [owner, subscriptions] = await Promise.all([
			tx.query.user.findFirst({
				where: eq(user.id, userId),
				columns: { primaryPageHandle: true },
			}),
			tx.query.creemSubscription.findMany({
				where: eq(creemSubscription.referenceId, userId),
			}),
		]);
		if (!owner) return;
		const access = getPlanAccess(
			subscriptions.map((subscription) => ({
				productId: subscription.productId,
				status: subscription.status,
				periodEnd: subscription.periodEnd,
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			})),
			proProductIds,
			now,
		);
		const cancellationScheduled =
			access.cancelAtPeriodEnd ||
			access.status?.toLowerCase() === "scheduled_cancel";
		const periodEnded = access.periodEnd
			? access.periodEnd <= now
			: ["canceled", "expired"].includes(access.status?.toLowerCase() ?? "");
		if (access.hasAccess && !cancellationScheduled) {
			await tx
				.update(pages)
				.set({ deletionScheduledAt: null })
				.where(eq(pages.userId, userId));
			return;
		}
		if (
			!access.productId ||
			!proProductIds.includes(access.productId) ||
			(!cancellationScheduled && !periodEnded)
		)
			return;

		const deletionScheduledAt = new Date(
			(access.periodEnd ?? now).getTime() + PAGE_GRACE_PERIOD_MS,
		);
		await tx
			.update(pages)
			.set({ deletionScheduledAt })
			.where(
				and(
					eq(pages.userId, userId),
					owner.primaryPageHandle
						? ne(pages.handle, owner.primaryPageHandle)
						: undefined,
				),
			);
		if (owner.primaryPageHandle) {
			await tx
				.update(pages)
				.set({ deletionScheduledAt: null })
				.where(
					and(
						eq(pages.userId, userId),
						eq(pages.handle, owner.primaryPageHandle),
					),
				);
		}
	});
}

export async function deleteExpiredPages({
	db,
	bucket,
	now = new Date(),
	proProductIds,
	skipUserIds = new Set<string>(),
}: {
	db: DatabaseClient;
	bucket: R2Bucket;
	now?: Date;
	proProductIds: readonly string[];
	skipUserIds?: ReadonlySet<string>;
}) {
	const expiredPages = await db.query.pages.findMany({
		where: and(
			isNotNull(pages.deletionScheduledAt),
			lte(pages.deletionScheduledAt, now),
		),
		columns: { id: true, userId: true, handle: true },
	});
	for (const candidate of expiredPages) {
		if (skipUserIds.has(candidate.userId)) continue;
		const deleted = await db.transaction(async (tx) => {
			await lockUser(tx, candidate.userId);
			const [owner, subscriptions, page] = await Promise.all([
				tx.query.user.findFirst({
					where: eq(user.id, candidate.userId),
					columns: { primaryPageHandle: true },
				}),
				tx.query.creemSubscription.findMany({
					where: eq(creemSubscription.referenceId, candidate.userId),
				}),
				tx.query.pages.findFirst({
					where: and(
						eq(pages.id, candidate.id),
						eq(pages.userId, candidate.userId),
					),
					columns: { id: true, handle: true, deletionScheduledAt: true },
				}),
			]);
			if (!page?.deletionScheduledAt || page.deletionScheduledAt > now)
				return false;
			const access = getPlanAccess(
				subscriptions.map((subscription) => ({
					productId: subscription.productId,
					status: subscription.status,
					periodEnd: subscription.periodEnd,
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
				})),
				proProductIds,
				now,
			);
			if (access.hasAccess || owner?.primaryPageHandle === page.handle) {
				await tx
					.update(pages)
					.set({ deletionScheduledAt: null })
					.where(eq(pages.id, page.id));
				return false;
			}
			await tx.delete(pages).where(eq(pages.id, page.id));
			return true;
		});
		if (deleted) {
			await deletePageMedia(
				bucket,
				`users/${candidate.userId}/pages/${candidate.id}/`,
			);
		}
	}
}
