import { pageHandleResponseSchema } from "@grabbin/api";
import { handleAvailabilityResponseSchema } from "@grabbin/page-handle";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export async function checkPageHandle(handle: string, signal?: AbortSignal) {
	const response = await apiClient.pages.check.$get(
		{ query: { handle } },
		{ init: { signal } },
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(handleAvailabilityResponseSchema, await response.json());
}

export async function createPage(handle: string) {
	const response = await apiClient.pages.$post({ json: { handle } });
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageHandleResponseSchema, await response.json()).page.handle;
}

export async function changePageHandle(handle: string, nextHandle: string) {
	const response = await apiClient.pages[":handle"].handle.$patch(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ handle: nextHandle }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageHandleResponseSchema, await response.json()).page.handle;
}

export async function getOwnedPages() {
	const response = await apiClient.pages.owned.$get();
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = await response.json();
	if (!("pages" in result)) throw new Error("Could not load your pages.");
	return result;
}

export async function changePrimaryPage(handle: string) {
	const response = await apiClient.pages[":handle"].primary.$patch({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
}

export async function deletePage(handle: string) {
	const response = await apiClient.pages[":handle"].$delete({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
}
