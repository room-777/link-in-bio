import { creemClient } from "@creem_io/better-auth/client";
import type { AuthOptions } from "@my-better-t-app/auth";
import { env } from "@my-better-t-app/env/web";
import {
	emailOTPClient,
	inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { ApiError } from "server";

function getServerUrl(url: string) {
	const processEnv = (
		globalThis as {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

	if (!normalized.startsWith("/")) {
		return normalized;
	}

	if (typeof window !== "undefined") {
		return `${window.location.origin}${normalized}`;
	}

	const vercelUrl =
		processEnv?.VERCEL_ENV === "production"
			? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
			: (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
	if (vercelUrl) {
		const origin = vercelUrl.startsWith("http")
			? vercelUrl
			: `https://${vercelUrl}`;
		return `${origin}${normalized}`;
	}

	return `http://localhost:3001${normalized}`;
}
export const authClient = createAuthClient({
	// Keep the client path aligned with Better Auth's server-side basePath.
	baseURL: new URL(
		"/auth",
		getServerUrl(env.NEXT_PUBLIC_SERVER_URL),
	).toString(),
	plugins: [
		creemClient(),
		emailOTPClient(),
		inferAdditionalFields<AuthOptions>(),
	],
});

export function getAuthErrorMessage(error: unknown) {
	if (!error || typeof error !== "object") {
		return "요청을 처리하지 못했습니다.";
	}

	const details = error as Partial<ApiError> & {
		message?: string;
		statusText?: string;
	};

	if (details.detail) return details.detail;
	if (details.message) return details.message;
	if (details.statusText) return details.statusText;

	return "요청을 처리하지 못했습니다.";
}

export type Session = typeof authClient.$Infer.Session;
