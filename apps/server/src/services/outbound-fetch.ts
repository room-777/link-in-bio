import type { AppEnv } from "../types";

type ProxyResponse = {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
};

function toBase64(bytes: Uint8Array) {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}

function fromBase64(value: string) {
	const binary = atob(value);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Route local Workerd egress through the executor's proxy-aware Bun sidecar. */
export function createOutboundFetch(
	env: AppEnv["Bindings"] | undefined,
): typeof fetch {
	const proxyUrl = env?.LOCAL_OUTBOUND_PROXY_URL;
	if (!proxyUrl) return fetch;

	return async (input, init) => {
		const request = new Request(input, init);
		const body = request.body ? await request.arrayBuffer() : undefined;
		const response = await fetch(`${proxyUrl}/fetch`, {
			method: "POST",
			signal: request.signal,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				url: request.url,
				method: request.method,
				headers: Object.fromEntries(request.headers),
				...(body ? { body: toBase64(new Uint8Array(body)) } : {}),
				redirect: request.redirect,
			}),
		});
		if (!response.ok) throw new Error("Local outbound proxy request failed");

		const result = (await response.json()) as ProxyResponse;
		const responseBody = result.body ? fromBase64(result.body) : null;
		return new Response(responseBody, {
			status: result.status,
			statusText: result.statusText,
			headers: result.headers,
		});
	};
}
