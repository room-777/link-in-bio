import type { DatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import {
	type HandleAvailabilityResponse,
	handleAvailabilityResponseSchema,
	isReservedPageHandle,
	normalizePageHandle,
	pageHandleSchema,
} from "@grabbin/api";
import { eq } from "drizzle-orm";
import * as v from "valibot";

export const checkPageHandle = async ({
	db,
	rawHandle,
}: {
	db: DatabaseClient;
	rawHandle: string;
}): Promise<HandleAvailabilityResponse> => {
	const handle =
		normalizePageHandle(rawHandle);
	const parsed = v.safeParse(
		pageHandleSchema,
		rawHandle,
	);
	if (!parsed.success)
		return v.parse(
			handleAvailabilityResponseSchema,
			{
				handle,
				available: false,
				reason: "invalid",
			},
		);
	if (isReservedPageHandle(handle))
		return v.parse(
			handleAvailabilityResponseSchema,
			{
				handle,
				available: false,
				reason: "reserved",
			},
		);
	const existingPage =
		await db.query.pages.findFirst({
			where: eq(pages.handle, handle),
		});
	return v.parse(
		handleAvailabilityResponseSchema,
		{
			handle,
			available: !existingPage,
			reason: existingPage
				? "taken"
				: null,
		},
	);
};
