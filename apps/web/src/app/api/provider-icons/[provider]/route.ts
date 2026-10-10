import { env } from "cloudflare:workers";
import { env as webEnv } from "@grabbin/env/web";
import { providerDefinitionList } from "@grabbin/page-link";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const { provider: rawProvider } = await params;
	const extension = rawProvider.endsWith(".webp") ? "webp" : "svg";
	const provider = rawProvider.replace(/\.(?:svg|webp)$/, "");
	if (!providerDefinitionList.some(({ id }) => id === provider)) {
		return new Response("Provider icon not found.", { status: 404 });
	}

	const headers = new Headers();
	const etag = request.headers.get("If-None-Match");
	if (etag) headers.set("If-None-Match", etag);

	let response: Response;
	try {
		const server = (env as { SERVER?: Fetcher }).SERVER;
		response = server
			? await server.fetch(
					new Request(
						`https://server/provider-icons/${provider}.${extension}`,
						{
							headers,
						},
					),
				)
			: await fetch(
					new URL(
						`/provider-icons/${provider}.${extension}`,
						webEnv.NEXT_PUBLIC_SERVER_URL,
					),
					{ headers },
				);
	} catch {
		return new Response("Provider icon storage is unavailable.", {
			status: 503,
		});
	}

	const responseHeaders = new Headers(response.headers);
	if (response.ok || response.status === 304) {
		responseHeaders.set("Cache-Control", "public, max-age=31556952, immutable");
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}
