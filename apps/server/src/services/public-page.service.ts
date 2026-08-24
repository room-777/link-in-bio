import type { DatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import {
	pageByHandleResponseSchema,
	pageHandleSchema,
} from "@grabbin/api";
import { eq, isNull } from "drizzle-orm";
import * as v from "valibot";
import { getPlanAccess } from "../core/billing";
import { NotFoundError } from "../exceptions/http-exceptions";
import {
	mapPageResponse,
	mapPublicPageResponse,
} from "../mappers/page.mapper";
import {
	listPageItems,
	mapPageItemResponse,
} from "./page-item.service";

export const listPublicPageHandles = async ({
	db,
}: {
	db: DatabaseClient;
}) => {
	const result = await db.query.pages.findMany({
		where: isNull(pages.deletionScheduledAt),
		columns: { handle: true },
		orderBy: (page, { asc }) => [asc(page.handle)],
	});

	return result.map((page) => page.handle);
};

export const getPublicPage = async ({
	db,
	handle,
	publicBaseUrl,
	viewerUserId,
}: {
	db: DatabaseClient;
	handle: string;
	publicBaseUrl?: string;
	viewerUserId?: string | null;
}) => {
	const parsed = v.safeParse(
		pageHandleSchema,
		handle,
	);
	if (!parsed.success)
		throw new NotFoundError("Page");
	const page =
		await db.query.pages.findFirst({
			where: eq(
				pages.handle,
				parsed.output,
			),
		});
	if (!page)
		throw new NotFoundError("Page");
	const planAccess =
		await getPlanAccess({
			db,
			userId: page.userId,
		});
	return v.parse(
		pageByHandleResponseSchema,
		{
			page:
				viewerUserId === page.userId
					? mapPageResponse(page)
					: mapPublicPageResponse(page),
			items: (
				await listPageItems(db, page.id)
			).map((item) =>
				mapPageItemResponse(
					item,
					publicBaseUrl,
					false,
				),
			),
			visitorsEnabled:
				planAccess.hasAccess,
		},
	);
};
