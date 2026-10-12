import { publicViewsResponseSchema } from "@grabbin/api";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export async function getPublicViews(
	handle: string,
	timezone: string,
	signal: AbortSignal,
) {
	const request = { param: { handle }, query: { timezone } };
	const response = await apiClient.pages[":handle"].views.$get(request, {
		init: { signal },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(publicViewsResponseSchema, await response.json());
}
