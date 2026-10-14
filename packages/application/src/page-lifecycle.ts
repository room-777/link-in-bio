import type { DatabaseClient } from "@grabbin/db";
import { pages } from "@grabbin/db/schema/index";
import { isReservedPageHandle } from "@grabbin/page-handle";
import { asc } from "drizzle-orm";

export { PageServiceError } from "./exceptions/page.exception";

export async function listSitemapHandles(db: DatabaseClient) {
	const pagesForSitemap = await db.query.pages.findMany({
		columns: { handle: true, bio: true },
		orderBy: asc(pages.handle),
	});
	return pagesForSitemap
		.filter(
			({ handle, bio }) =>
				!isReservedPageHandle(handle) && !/\blorem ipsum\b/i.test(bio ?? ""),
		)
		.map(({ handle }) => handle);
}
