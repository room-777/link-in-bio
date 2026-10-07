import type { DatabaseClient } from "@grabbin/db";
import { eq } from "@grabbin/db/drizzle";
import { pages } from "@grabbin/db/schema/index";
import {
	handleAvailabilityResponseSchema,
	isReservedPageHandle,
	normalizePageHandle,
	pageHandleSchema,
} from "@grabbin/page-handle";
import * as v from "valibot";

type CheckPageHandleInput = {
	db: DatabaseClient;
	rawHandle: string;
};

export async function checkPageHandle({ db, rawHandle }: CheckPageHandleInput) {
	const normalizedHandle = normalizePageHandle(rawHandle);
	const parsedHandle = v.safeParse(pageHandleSchema, rawHandle);

	if (!parsedHandle.success) {
		return v.parse(handleAvailabilityResponseSchema, {
			handle: normalizedHandle,
			available: false,
			reason: "invalid",
		});
	}

	const handle = parsedHandle.output;

	if (isReservedPageHandle(handle)) {
		return v.parse(handleAvailabilityResponseSchema, {
			handle,
			available: false,
			reason: "reserved",
		});
	}

	const existingPage = await db.query.pages.findFirst({
		where: eq(pages.handle, handle),
		columns: { id: true },
	});

	return v.parse(handleAvailabilityResponseSchema, {
		handle,
		available: !existingPage,
		reason: existingPage ? "taken" : null,
	});
}
