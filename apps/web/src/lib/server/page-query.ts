import { pageByHandleResponseSchema } from "@grabbin/api";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

export async function fetchPage(
	handle: string,
	headers?: Record<string, string>,
) {
	const client = getServerApiClient() ?? apiClient;
	const response = await client.pages[":handle"].$get(
		{ param: { handle } },
		headers ? { headers } : undefined,
	);

	if (!response.ok) {
		if (response.status === 404) return null;
		throw new Error(await getApiErrorMessage(response));
	}

	const body = await response.json();
	return "page" in body ? v.parse(pageByHandleResponseSchema, body) : null;
}
