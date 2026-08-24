import { env } from "cloudflare:workers";
import type { AppType } from "@grabbin/server";
import { hc } from "hono/client";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

type ServiceBinding = {
	fetch: typeof fetch;
};

function getBackendBaseUrl() {
	return env.BETTER_AUTH_URL ?? getApiBaseUrl();
}

function getBackendBinding() {
	return (env as unknown as { BACKEND?: ServiceBinding }).BACKEND;
}

export function createBackendClient() {
	const binding = getBackendBinding();
	const baseUrl = getBackendBaseUrl();

	if (binding) {
		return hc<AppType>(baseUrl, {
			fetch: binding.fetch.bind(binding),
		});
	}

	return hc<AppType>(baseUrl);
}

export function fetchBackend(path: string, init?: RequestInit) {
	const binding = getBackendBinding();
	const url = new URL(path, getBackendBaseUrl()).toString();

	if (binding) {
		return binding.fetch(url, init);
	}

	return fetch(url, init);
}

export function getBackendRequestHeaders(request: Request) {
	const headers = new Headers();
	for (const name of ["cookie", "origin", "content-type"]) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
}
