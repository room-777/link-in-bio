import type { DatabaseClient } from "@grabbin/db";
import {
	creemSubscription,
	pageDomains,
	pages,
} from "@grabbin/db/schema/index";
import type { PlanSubscription } from "@grabbin/plan";
import { and, asc, eq, isNull, lte, ne, or, sql } from "drizzle-orm";

export type PageDomainRow = typeof pageDomains.$inferSelect;
export type DomainPage = { id: string; userId: string; handle: string };
type DomainDatabase =
	| DatabaseClient
	| Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];

export interface PageDomainRepository {
	pageByHandle(handle: string): Promise<DomainPage | undefined>;
	pageById(id: string): Promise<DomainPage | undefined>;
	subscriptions(userId: string): Promise<PlanSubscription[]>;
	byPage(pageId: string): Promise<PageDomainRow | undefined>;
	byHostname(hostname: string): Promise<PageDomainRow | undefined>;
	byId(id: string): Promise<PageDomainRow | undefined>;
	insert(row: typeof pageDomains.$inferInsert): Promise<PageDomainRow>;
	update(
		id: string,
		values: Partial<typeof pageDomains.$inferInsert>,
	): Promise<PageDomainRow>;
	remove(id: string): Promise<void>;
	lockPage<T>(
		id: string,
		work: (store: PageDomainRepository) => Promise<T>,
	): Promise<T>;
	lockDomain<T>(
		id: string,
		work: (store: PageDomainRepository) => Promise<T>,
	): Promise<T>;
	due(
		now: Date,
		includeActive: boolean,
		limit: number,
		includeExpired?: boolean,
	): Promise<PageDomainRow[]>;
}

/** Keeps domain SQL and row locks in one place; locks serialize checks and disconnection. */
export function createPageDomainRepository(
	db: DomainDatabase,
): PageDomainRepository {
	return {
		pageByHandle: (handle) =>
			db.query.pages.findFirst({
				where: eq(pages.handle, handle),
				columns: { id: true, userId: true, handle: true },
			}),
		pageById: (id) =>
			db.query.pages.findFirst({
				where: eq(pages.id, id),
				columns: { id: true, userId: true, handle: true },
			}),
		subscriptions: (userId) =>
			db.query.creemSubscription.findMany({
				where: eq(creemSubscription.referenceId, userId),
			}),
		byPage: (pageId) =>
			db.query.pageDomains.findFirst({ where: eq(pageDomains.pageId, pageId) }),
		byHostname: (hostname) =>
			db.query.pageDomains.findFirst({
				where: eq(pageDomains.hostname, hostname),
			}),
		byId: (id) =>
			db.query.pageDomains.findFirst({ where: eq(pageDomains.id, id) }),
		async insert(row) {
			const [saved] = await db.insert(pageDomains).values(row).returning();
			if (!saved) throw new Error("Domain was not saved.");
			return saved;
		},
		async update(id, values) {
			const [saved] = await db
				.update(pageDomains)
				.set(values)
				.where(eq(pageDomains.id, id))
				.returning();
			if (!saved) throw new Error("Domain was not found.");
			return saved;
		},
		async remove(id) {
			await db.delete(pageDomains).where(eq(pageDomains.id, id));
		},
		lockPage: (id, work) =>
			db.transaction(async (tx) => {
				await tx.execute(sql`select id from pages where id = ${id} for update`);
				return work(createPageDomainRepository(tx));
			}),
		lockDomain: (id, work) =>
			db.transaction(async (tx) => {
				await tx.execute(
					sql`select id from page_domains where id = ${id} for update`,
				);
				return work(createPageDomainRepository(tx));
			}),
		due: (now, includeActive, limit, includeExpired = false) =>
			db.query.pageDomains.findMany({
				where: and(
					or(
						isNull(pageDomains.pageId),
						lte(pageDomains.nextCheckAt, now),
						includeExpired ? lte(pageDomains.graceEndsAt, now) : undefined,
					),
					includeActive
						? undefined
						: or(ne(pageDomains.status, "active"), isNull(pageDomains.pageId)),
				),
				orderBy: [
					...(includeExpired
						? [
								sql`case when ${pageDomains.graceEndsAt} <= ${now} then 0 else 1 end`,
							]
						: []),
					asc(pageDomains.nextCheckAt),
				],
				limit,
			}),
	};
}
