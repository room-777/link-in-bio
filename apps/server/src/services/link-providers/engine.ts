import type { PageItemLinkMetadata } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import { getProviderEnricher } from "./registry";
import type { LinkProviderContext } from "./types";

export async function enrichLinkProvider(
	url: URL,
	context: LinkProviderContext,
): Promise<PageItemLinkMetadata> {
	const resolved = resolveLinkProvider(url);
	const enricher = resolved.target
		? getProviderEnricher(resolved.id)
		: undefined;
	if (!resolved.target || !enricher) return { provider: resolved.id };
	try {
		const metadata = await enricher(url, resolved.target, context);
		return { ...metadata, provider: resolved.id };
	} catch {
		return { provider: resolved.id };
	}
}
