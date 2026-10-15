import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const port = Number(process.env.OUTBOUND_PROXY_PORT ?? 3002);
const maxResponseBytes = 5 * 1024 * 1024;
const maxRedirects = 5;

type ProxyRequest = {
	url: string;
	method: string;
	headers?: Record<string, string>;
};

function isPublicAddress(address: string) {
	if (isIP(address) === 4) {
		const [a, b] = address.split(".").map(Number);
		return !(
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			a >= 224
		);
	}
	if (isIP(address) === 6) {
		const normalized = address.toLowerCase();
		return !(
			normalized === "::" ||
			normalized === "::1" ||
			normalized.startsWith("fc") ||
			normalized.startsWith("fd") ||
			normalized.startsWith("fe8") ||
			normalized.startsWith("fe9") ||
			normalized.startsWith("fea") ||
			normalized.startsWith("feb") ||
			normalized.startsWith("::ffff:")
		);
	}
	return false;
}

async function assertPublicHttpsUrl(value: string) {
	const url = new URL(value);
	if (url.protocol !== "https:" || url.username || url.password)
		throw new Error("Only public HTTPS URLs are allowed");
	const hostname = url.hostname.toLowerCase();
	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local")
	)
		throw new Error("Local hosts are not allowed");
	if (isIP(hostname)) {
		if (!isPublicAddress(hostname))
			throw new Error("Private addresses are not allowed");
		return url;
	}
	const addresses = await lookup(hostname, { all: true, verbatim: true });
	if (
		addresses.length === 0 ||
		addresses.some(({ address }) => !isPublicAddress(address))
	)
		throw new Error("Private addresses are not allowed");
	return url;
}

async function readLimited(response: Response) {
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > maxResponseBytes) {
			await reader.cancel();
			throw new Error("Upstream response is too large");
		}
		chunks.push(value);
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

function toBase64(bytes: Uint8Array) {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}

Bun.serve({
	host: "127.0.0.1",
	port,
	async fetch(request) {
		if (request.method !== "POST" || new URL(request.url).pathname !== "/fetch")
			return new Response("Not found", { status: 404 });
		if (Number(request.headers.get("content-length") ?? "0") > 32_768)
			return new Response("Request too large", { status: 413 });

		let input: ProxyRequest;
		try {
			input = (await request.json()) as ProxyRequest;
		} catch {
			return new Response("Invalid JSON", { status: 400 });
		}
		if (
			typeof input.url !== "string" ||
			input.url.length > 4096 ||
			(input.method !== "GET" && input.method !== "HEAD")
		)
			return new Response("Invalid outbound request", { status: 400 });

		try {
			let url = await assertPublicHttpsUrl(input.url);
			let upstream: Response | undefined;
			for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
				upstream = await fetch(url, {
					method: input.method,
					headers: input.headers,
					redirect: "manual",
				});
				if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
				const location = upstream.headers.get("location");
				if (!location || redirects === maxRedirects) break;
				url = await assertPublicHttpsUrl(new URL(location, url).toString());
			}
			if (!upstream) throw new Error("No upstream response");
			const body =
				input.method === "HEAD"
					? new Uint8Array()
					: await readLimited(upstream);
			const headers = Object.fromEntries(
				[...upstream.headers].filter(
					([name]) =>
						!["connection", "content-length", "transfer-encoding"].includes(
							name,
						),
				),
			);
			return Response.json({
				status: upstream.status,
				statusText: upstream.statusText,
				headers,
				body: toBase64(body),
			});
		} catch (error) {
			return Response.json(
				{
					error:
						error instanceof Error ? error.message : "Outbound request failed",
				},
				{ status: 502 },
			);
		}
	},
});
