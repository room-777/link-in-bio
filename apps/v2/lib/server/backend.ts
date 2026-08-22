import type { AppType } from "@grabbin/backend";
import {
  type ClientResponse,
  hc,
  type InferRequestType,
  parseResponse,
} from "hono/client";
import { env } from "@/lib/env";

const FORWARDED_REQUEST_HEADERS = [
  "cookie",
  "origin",
  "content-type",
  "authorization",
] as const;

type BackendSuccess<T> = {
  ok: true;
  response: Response;
  data: T;
};

type BackendFailure = {
  ok: false;
  response: Response;
};

export type BackendResult<T> = BackendSuccess<T> | BackendFailure;

export function createBackendClient(headers?: HeadersInit, init?: RequestInit) {
  const requestHeaders = headers ? new Headers(headers) : undefined;

  return hc<AppType>(env.NEXT_PUBLIC_API_BASE_URL, {
    fetch: env.BACKEND.fetch.bind(env.BACKEND),
    ...(init ? { init } : {}),
    ...(requestHeaders
      ? { headers: Object.fromEntries(requestHeaders.entries()) }
      : {}),
  });
}

export function requestBackendWithBody<
  Endpoint extends (...args: never[]) => Promise<unknown>,
>(
  endpoint: Endpoint,
  input: Omit<InferRequestType<Endpoint>, "json">,
  body: BodyInit | null,
) {
  return (
    endpoint as unknown as (
      input: InferRequestType<Endpoint>,
      options: { init: RequestInit },
    ) => ReturnType<Endpoint>
  )(input as InferRequestType<Endpoint>, {
    init:
      body === null
        ? { body: null }
        : ({ body, duplex: "half" } as RequestInit),
  });
}

export function toResponse(response: ClientResponse<unknown>) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function parseBackendResponse<T>(
  response: ClientResponse<T>,
): Promise<BackendResult<T>> {
  if (!response.ok) {
    return { ok: false as const, response: toResponse(response) };
  }

  const data = (await parseResponse(
    response.clone() as ClientResponse<T>,
  )) as T;

  return { ok: true as const, response: toResponse(response), data };
}

export function getBackendRequestHeaders(request: Request) {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}
