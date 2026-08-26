import {
  type CreatePageRequest,
  type CreatePageResponse,
  createPageResponseSchema,
  type HandleAvailabilityResponse,
  handleAvailabilityResponseSchema,
  type MyPageResponse,
  myPageResponseSchema,
  type OwnedPageListResponse,
  ownedPageListResponseSchema,
  type PageItemBatchRequest,
  type PageItemBatchResponse,
  pageItemBatchResponseSchema,
  type UpdatePageRequest,
  type UpdatePageResponse,
  updatePageResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";
import {
  ENTRY_ROUTE_HEADER,
  getEntryRouteHeader,
} from "@/lib/analytics/simple-analytics";

export const pageQueryKey = (handle: string) => ["pages", handle] as const;
export const myPageQueryKey = ["pages", "me"] as const;
export const ownedPagesQueryKey = ["pages", "owned"] as const;

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      accept: "application/json",
      [ENTRY_ROUTE_HEADER]: getEntryRouteHeader(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Page request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function checkPageHandle(
  handle: string,
): Promise<HandleAvailabilityResponse> {
  const params = new URLSearchParams({ handle });
  return v.parse(
    handleAvailabilityResponseSchema,
    await requestJson(`/api/pages/check?${params.toString()}`),
  );
}

export async function createPage(
  input: CreatePageRequest,
): Promise<CreatePageResponse> {
  return v.parse(
    createPageResponseSchema,
    await requestJson("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updatePage(
  handle: string,
  input: UpdatePageRequest,
): Promise<UpdatePageResponse> {
  return v.parse(
    updatePageResponseSchema,
    await requestJson(`/api/pages/${encodeURIComponent(handle)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function patchPageItemsBatch(
  handle: string,
  batch: PageItemBatchRequest,
): Promise<PageItemBatchResponse> {
  return v.parse(
    pageItemBatchResponseSchema,
    await requestJson(`/api/pages/${encodeURIComponent(handle)}/batch`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
    }),
  );
}

export async function getMyPage(): Promise<MyPageResponse> {
  return v.parse(myPageResponseSchema, await requestJson("/api/pages/me"));
}

export async function getOwnedPages(): Promise<OwnedPageListResponse> {
  return v.parse(ownedPageListResponseSchema, await requestJson("/api/pages"));
}
