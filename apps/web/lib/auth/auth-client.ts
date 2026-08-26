import { creemClient } from "@creem_io/better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import {
  ENTRY_ROUTE_HEADER,
  getEntryRouteHeader,
} from "@/lib/analytics/simple-analytics";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export function createAuthClient(apiBaseUrl: string) {
  return createBetterAuthClient({
    baseURL: getApiBaseUrl(apiBaseUrl),
    basePath: "/auth",
    fetchOptions: {
      credentials: "include",
      onRequest: ({ headers }) => {
        headers.set(ENTRY_ROUTE_HEADER, getEntryRouteHeader());
      },
    },
    plugins: [emailOTPClient(), creemClient()],
  });
}
