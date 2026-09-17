import { hc, parseResponse } from "hono/client";
import type { InferRequestType, InferResponseType } from "hono/client";

import type { AppType } from "server";
import { env } from "@my-better-t-app/env/web";

export const apiClient = hc<AppType>(env.NEXT_PUBLIC_SERVER_URL, {
	init: {
		credentials: "include",
	},
});

export { parseResponse };
export type { InferRequestType, InferResponseType };
