import { creemClient } from "@creem_io/better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export function createAuthClient(apiBaseUrl: string) {
  return createBetterAuthClient({
    baseURL: getApiBaseUrl(apiBaseUrl),
    basePath: "/auth",
    fetchOptions: {
      credentials: "include",
    },
    plugins: [emailOTPClient(), creemClient()],
  });
}
