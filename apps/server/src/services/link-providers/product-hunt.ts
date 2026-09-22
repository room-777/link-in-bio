import type { PageItemLinkMetadata } from "@grabbin/api";
import {
	asNumber,
	asRecord,
	asString,
	fetchJson,
	getHttpsUrl,
	getProviderData,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

export async function enrichProductHunt(
	url: URL,
	target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const slug = target.kind === "product" ? target.params.slug : undefined;
	const token = asString(context.env?.PRODUCT_HUNT_TOKEN);
	if (!slug || !token) return {};
	const payload = asRecord(
		await fetchJson("https://api.producthunt.com/v2/api/graphql", context, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query:
					"query ($slug: String!) { post(slug: $slug) { name tagline votesCount thumbnail { url } } }",
				variables: { slug },
			}),
		}),
	);
	const post = asRecord(asRecord(payload?.data)?.post);
	if (!post) return {};
	return {
		title: asString(post.name),
		description: asString(post.tagline),
		imageUrl: getHttpsUrl(asRecord(post.thumbnail)?.url, url),
		providerData: getProviderData({ upvoteCount: asNumber(post.votesCount) }),
	};
}
