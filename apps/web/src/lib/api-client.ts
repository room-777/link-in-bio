import { getApiErrorMessage as getApiErrorDetail } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import type { InferRequestType, InferResponseType } from "hono/client";
import { hc, parseResponse } from "hono/client";
import type { AppType } from "server";

export const apiClient = hc<AppType>(env.NEXT_PUBLIC_SERVER_URL, {
	init: {
		credentials: "include",
	},
});

export async function getApiErrorMessage(response: {
	json: () => Promise<unknown>;
	statusText?: string;
}) {
	return getApiErrorDetail(
		await response.json().catch(() => null),
		response.statusText || "Please try again.",
	);
}

export type { InferRequestType, InferResponseType };
export { parseResponse };
