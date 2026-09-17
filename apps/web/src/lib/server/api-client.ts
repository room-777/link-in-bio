import { env } from "@grabbin/env/server";
import type { InferRequestType, InferResponseType } from "hono/client";
import { hc, parseResponse } from "hono/client";
import type { AppType } from "server";

export async function getServerApiClient() {
	const server = (env as typeof env & { SERVER: Fetcher }).SERVER;

	return hc<AppType>("https://server", {
		fetch: server.fetch.bind(server),
	});
}

export type { InferRequestType, InferResponseType };
export { parseResponse };
