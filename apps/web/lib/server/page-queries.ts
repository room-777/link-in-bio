import { normalizePageHandle } from "@grabbin/api";
import type { InferRequestType, InferResponseType } from "hono/client";
import { headers } from "next/headers";
import { cache } from "react";
import {
  createBackendClient,
  parseBackendResponse,
} from "@/lib/server/backend";

type BackendClient = ReturnType<typeof createBackendClient>;
type CreatePageEndpoint = BackendClient["pages"]["$post"];
type CreatePageInput = InferRequestType<CreatePageEndpoint>["json"];

const FORWARDED_HEADERS = ["cookie", "origin", "x-entry-route"] as const;

async function getReadHeaders(request?: Request) {
  const source = request?.headers ?? (await headers());
  const forwarded = new Headers();

  for (const name of FORWARDED_HEADERS) {
    const value = source.get(name);
    if (value) forwarded.set(name, value);
  }

  return forwarded;
}

export function createReadResponse(response: Response) {
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("cache-control", "private, no-store");

  const vary = responseHeaders.get("vary");
  const hasCookieVary = vary
    ?.split(",")
    .some((value) => value.trim().toLowerCase() === "cookie");
  if (!hasCookieVary) {
    responseHeaders.set("vary", vary ? `${vary}, Cookie` : "Cookie");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function getSession(request?: Request) {
  const client = createBackendClient(await getReadHeaders(request), {
    cache: "no-store",
  });
  const endpoint = client.auth["get-session"].$get;
  return parseBackendResponse<InferResponseType<typeof endpoint>>(
    await endpoint(),
  );
}

export async function getMyPage(request?: Request) {
  const client = createBackendClient(await getReadHeaders(request), {
    cache: "no-store",
  });
  return parseBackendResponse<InferResponseType<typeof client.pages.me.$get>>(
    await client.pages.me.$get(),
  );
}

export async function getOwnedPages(request?: Request) {
  const client = createBackendClient(await getReadHeaders(request), {
    cache: "no-store",
  });
  return parseBackendResponse<InferResponseType<typeof client.pages.$get>>(
    await client.pages.$get(),
  );
}

export const getPageByHandle = cache(async function getPageByHandle(
  handle: string,
  request?: Request,
) {
  const client = createBackendClient(await getReadHeaders(request), {
    cache: "no-store",
  });
  const endpoint = client.pages[":handle"].$get;
  return parseBackendResponse<InferResponseType<typeof endpoint>>(
    await endpoint({
      param: { handle: normalizePageHandle(handle) },
    }),
  );
});

export async function checkPageHandle(handle: string, request?: Request) {
  const client = createBackendClient(await getReadHeaders(request), {
    cache: "no-store",
  });
  return parseBackendResponse<
    InferResponseType<typeof client.pages.check.$get>
  >(
    await client.pages.check.$get({
      query: { handle },
    }),
  );
}

export async function createPage(input: CreatePageInput, request?: Request) {
  const client = createBackendClient(await getReadHeaders(request));
  return parseBackendResponse<InferResponseType<typeof client.pages.$post>>(
    await client.pages.$post({
      json: input,
    }),
  );
}
