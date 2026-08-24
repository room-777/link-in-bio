import {
	buildPlanAccess,
	getPlanAccess,
} from "@core/billing";
import type { DatabaseClient } from "@db/index";
import {
	creemSubscription,
	pages,
	user as userTable,
} from "@db/schema";
import { PRO_PRODUCT_IDS } from "@grabbin/plan";
import {
	and,
	eq,
	isNotNull,
	ne,
	sql,
} from "drizzle-orm";
import { ForbiddenError } from "../exceptions/http-exceptions";

const GRACE_PERIOD_MS =
	7 * 24 * 60 * 60 * 1000;

const lockUser = async (
	tx: unknown,
	userId: string,
) => {
	const execute = (
		tx as { execute?: unknown }
	).execute;
	if (typeof execute === "function")
		await (
			execute as (
				query: unknown,
			) => Promise<unknown>
		).call(
			tx,
			sql`select id from "user" where id = ${userId} for update`,
		);
};

const deletionDeadline = (
	periodEnd: Date,
) =>
	new Date(
		periodEnd.getTime() +
			GRACE_PERIOD_MS,
	);

export const assertPageWritable =
	async ({
		db,
		userId,
		page,
		now = new Date(),
	}: {
		db: DatabaseClient;
		userId: string;
		page: { id: string };
		now?: Date;
	}) => {
		const userQuery = (
			db.query as unknown as {
				user?: {
					findFirst?: (
						config: unknown,
					) => Promise<{
						primaryPageId?:
							| string
							| null;
					} | null>;
				};
			}
		).user;
		const [
			access,
			currentUser,
		] = await Promise.all([
			getPlanAccess({
				db,
				userId,
				now,
			}),
			typeof userQuery?.findFirst ===
			"function"
				? userQuery.findFirst({
						where: eq(
							userTable.id,
							userId,
						),
						columns: {
							primaryPageId: true,
						},
					})
				: Promise.resolve({
					primaryPageId: page.id,
				}),
		]);

		if (access.hasAccess) return;

		const isPrimary =
			currentUser?.primaryPageId ===
			page.id;
		if (isPrimary) return;

		throw new ForbiddenError(
			"This page is read-only.",
			"PAGE_READ_ONLY",
		);
	};

export const scheduleUserPagesAfterCancellation =
	async ({
		db,
		userId,
		periodEnd,
	}: {
		db: DatabaseClient;
		userId: string;
		periodEnd: Date;
	}) => {
		await db.transaction(async (tx) => {
			await lockUser(tx, userId);
			const currentUser =
				await tx.query.user.findFirst({
					where: eq(
						userTable.id,
						userId,
					),
					columns: {
						primaryPageId: true,
					},
				});
			if (!currentUser) return;
			await tx
				.update(pages)
				.set({
					deletionScheduledAt:
						deletionDeadline(periodEnd),
				})
				.where(
					and(
						eq(pages.userId, userId),
						currentUser.primaryPageId
							? ne(
									pages.id,
									currentUser.primaryPageId,
								)
							: undefined,
					),
				);
			if (currentUser.primaryPageId)
				await tx
					.update(pages)
					.set({
						deletionScheduledAt: null,
					})
					.where(
						and(
							eq(pages.userId, userId),
							eq(
								pages.id,
								currentUser.primaryPageId,
							),
						),
					);
		});
	};

export const restoreUserPagesAfterResubscribe =
	async ({
		db,
		userId,
	}: {
		db: DatabaseClient;
		userId: string;
	}) => {
		await db.transaction(async (tx) => {
			await lockUser(tx, userId);
			await tx
				.update(pages)
				.set({
					deletionScheduledAt: null,
				})
				.where(
					eq(pages.userId, userId),
				);
		});
	};

export const reconcileUserPageLifecycle =
	async ({
		db,
		userId,
		now = new Date(),
	}: {
		db: DatabaseClient;
		userId: string;
		now?: Date;
	}) => {
		await db.transaction(async (tx) => {
			await lockUser(tx, userId);
			const currentUser =
				await tx.query.user.findFirst({
					where: eq(
						userTable.id,
						userId,
					),
					columns: {
						primaryPageId: true,
					},
				});
			if (!currentUser) return;
			const subscriptions =
				await tx.query.creemSubscription.findMany(
					{
						where: eq(
							creemSubscription.referenceId,
							userId,
						),
					},
				);
			const access = buildPlanAccess(
				subscriptions,
				now,
			);
			if (access.hasAccess) {
				await tx
					.update(pages)
					.set({
						deletionScheduledAt: null,
					})
					.where(
						eq(pages.userId, userId),
					);
				return;
			}
			if (
				access.productId === null ||
				!PRO_PRODUCT_IDS.has(
					access.productId,
				) ||
				!access.periodEnd ||
				access.periodEnd > now
			)
				return;

			await tx
				.update(pages)
				.set({
					deletionScheduledAt:
						deletionDeadline(
							access.periodEnd,
						),
				})
				.where(
					and(
						eq(pages.userId, userId),
						currentUser.primaryPageId
							? ne(
									pages.id,
									currentUser.primaryPageId,
								)
							: undefined,
					),
				);
			if (currentUser.primaryPageId)
				await tx
					.update(pages)
					.set({
						deletionScheduledAt: null,
					})
					.where(
						and(
							eq(pages.userId, userId),
							eq(
								pages.id,
								currentUser.primaryPageId,
							),
						),
					);
		});
	};

export const hasPendingPageDeletion =
	async (
		db: DatabaseClient,
		userId: string,
	) =>
		(await db.query.pages.findFirst({
			where: and(
				eq(pages.userId, userId),
				isNotNull(
					pages.deletionScheduledAt,
				),
			),
			columns: { id: true },
		})) !== undefined;

export const getPageDeletionDeadline =
	deletionDeadline;
