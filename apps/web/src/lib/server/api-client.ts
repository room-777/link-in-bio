import { env } from "cloudflare:workers";
import type { InferRequestType, InferResponseType } from "hono/client";
import { hc, parseResponse } from "hono/client";
import type { AppType } from "server";

function getServerFetcher() {
	return (env as { SERVER?: Fetcher }).SERVER ?? null;
}

export function getServerFetch() {
	const server = getServerFetcher();
	return server ? server.fetch.bind(server) : undefined;
}

export function getServerApiClient() {
	const serverFetch = getServerFetch();
	if (!serverFetch) return null;

	return hc<AppType>("https://server", { fetch: serverFetch });
}

export type { InferRequestType, InferResponseType };
export { parseResponse };
