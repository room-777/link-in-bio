import { env } from "cloudflare:workers";
import type { InferRequestType, InferResponseType } from "hono/client";
import { hc, parseResponse } from "hono/client";
import type { AppType } from "server";

export function getServerApiClient() {
	const server = (env as { SERVER?: Fetcher }).SERVER;
	if (!server) return null;

	return hc<AppType>("https://server", {
		fetch: server.fetch.bind(server),
	});
}

export type { InferRequestType, InferResponseType };
export { parseResponse };
