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

	const body: unknown = await response.json();
	if (body === null || typeof body !== "object" || Array.isArray(body)) {
		const path = response.url
			? new URL(response.url, "http://localhost").pathname
			: "unknown path";
		const bodyType =
			body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
		console.error("Page API returned a non-object response.", {
			status: response.status,
			url: response.url,
			contentType: response.headers.get("content-type"),
			bodyType,
		});
		throw new Error(
			`Page API returned ${bodyType} instead of an object (HTTP ${response.status}, ${path}).`,
		);
	}
	return "page" in body ? v.parse(pageByHandleResponseSchema, body) : null;
}

export async function fetchSitemapHandles() {
	try {
		const client = getServerApiClient() ?? apiClient;
		const response = await client.pages.sitemap.$get();
		if (!response.ok) return [];
		return (await response.json()).handles;
	} catch {
		return [];
	}
}
