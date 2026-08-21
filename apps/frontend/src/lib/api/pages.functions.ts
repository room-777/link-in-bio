import {
	type CreatePageRequest,
	createPageRequestSchema,
	createPageResponseSchema,
	handleAvailabilityResponseSchema,
	myPageResponseSchema,
	normalizePageHandle,
	type OwnedPageListResponse,
	ownedPageListResponseSchema,
	type PageByHandleResponse,
	pageByHandleResponseSchema,
} from "@grabbin/api";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import * as v from "valibot";
import { fetchBackend } from "./backend-client.server";

function createCookieHeaders() {
	const headers = new Headers();
	const cookie = getRequestHeader("cookie");
	const origin = getRequestHeader("origin");

	if (cookie) {
		headers.set("cookie", cookie);
	}
	if (origin) {
		headers.set("origin", origin);
	}

	return headers;
}

export const checkPageHandleAvailability = createServerFn({
	method: "GET",
})
	.validator((data: { handle: string }) => data)
	.handler(async ({ data }) => {
		const params = new URLSearchParams({
			handle: data.handle,
		});
		const response = await fetchBackend(`/pages/check?${params}`, {
			method: "GET",
			headers: createCookieHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`Handle availability request failed with status ${response.status}.`,
			);
		}

		return v.parse(handleAvailabilityResponseSchema, await response.json());
	});

export const createPage = createServerFn({ method: "POST" })
	.validator((data: CreatePageRequest) =>
		v.parse(createPageRequestSchema, data),
	)
	.handler(async ({ data }) => {
		const headers = createCookieHeaders();
		headers.set("content-type", "application/json");

		const response = await fetchBackend("/pages", {
			method: "POST",
			headers,
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`Page creation failed with status ${response.status}.`);
		}

		return v.parse(createPageResponseSchema, await response.json());
	});

export const changePrimaryPage = createServerFn({ method: "POST" })
	.validator((data: { handle: string }) => ({
		handle: normalizePageHandle(data.handle),
	}))
	.handler(async ({ data }) => {
		const response = await fetchBackend(
			`/pages/${encodeURIComponent(data.handle)}/primary`,
			{
				method: "PATCH",
				headers: createCookieHeaders(),
			},
		);
		if (!response.ok) {
			throw new Error(
				`Primary page change failed with status ${response.status}.`,
			);
		}
	});

export const deletePage = createServerFn({ method: "POST" })
	.validator((data: { handle: string }) => ({
		handle: normalizePageHandle(data.handle),
	}))
	.handler(async ({ data }) => {
		const response = await fetchBackend(
			`/pages/${encodeURIComponent(data.handle)}`,
			{
				method: "DELETE",
				headers: createCookieHeaders(),
			},
		);
		if (!response.ok) {
			throw new Error(`Page deletion failed with status ${response.status}.`);
		}
	});

export const getMyPage = createServerFn({ method: "GET" }).handler(async () => {
	const response = await fetchBackend("/pages/me", {
		method: "GET",
		headers: createCookieHeaders(),
	});

	if (response.status === 401) {
		return v.parse(myPageResponseSchema, { page: null });
	}

	if (!response.ok) {
		throw new Error(`My page request failed with status ${response.status}.`);
	}

	return v.parse(myPageResponseSchema, await response.json());
});

export const getOwnedPages = createServerFn({ method: "GET" }).handler(
	async (): Promise<OwnedPageListResponse> => {
		const response = await fetchBackend("/pages", {
			method: "GET",
			headers: createCookieHeaders(),
		});
		if (response.status === 401)
			return { hasAccess: false, canCreatePage: false, pages: [] };
		if (!response.ok)
			throw new Error(
				`Owned pages request failed with status ${response.status}.`,
			);
		return v.parse(ownedPageListResponseSchema, await response.json());
	},
);

export const getPageByHandle = createServerFn({ method: "GET" })
	.validator((data: { handle: string }) => ({
		handle: normalizePageHandle(data.handle),
	}))
	.handler(async ({ data }): Promise<PageByHandleResponse | null> => {
		const response = await fetchBackend(
			`/pages/${encodeURIComponent(data.handle)}`,
			{
				method: "GET",
				headers: createCookieHeaders(),
			},
		);

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(`Page request failed with status ${response.status}.`);
		}

		return v.parse(pageByHandleResponseSchema, await response.json());
	});

export const MY_PAGE_QUERY_KEY = ["pages", "me"] as const;
export const OWNED_PAGES_QUERY_KEY = ["pages", "owned"] as const;

export function getPageByHandleQueryOptions(handle: string) {
	const normalizedHandle = normalizePageHandle(handle);

	return queryOptions({
		queryKey: ["pages", normalizedHandle] as const,
		queryFn: (): Promise<PageByHandleResponse | null> =>
			getPageByHandle({
				data: {
					handle: normalizedHandle,
				},
			}),
		// 변경: 공개 페이지 수정 후 오래된 페이지 데이터를 재사용하지 않는다.
		staleTime: 0,
	});
}
