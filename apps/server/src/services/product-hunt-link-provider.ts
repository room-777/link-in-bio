import type { PageItemLinkMetadata } from "@grabbin/api";
import type { LinkProvider } from "./link-providers";

const PRODUCT_HUNT_HOSTNAMES = new Set([
	"producthunt.com",
	"www.producthunt.com",
]);
const PRODUCT_HUNT_PRODUCT_PATH =
	/^\/products\/([^/]+)\/?$/;
const PRODUCT_HUNT_API_URL =
	"https://api.producthunt.com/v2/api/graphql";
const PRODUCT_HUNT_TIMEOUT_MS = 2500;

type ProductHuntGraphQLResponse = {
	data?: {
		post?: {
			name?: unknown;
			tagline?: unknown;
			votesCount?: unknown;
			thumbnail?: {
				url?: unknown;
			} | null;
		} | null;
	};
	errors?: Array<{ message?: string }>;
};

function getProductHuntProductSlug(
	url: URL,
): string | undefined {
	if (
		!PRODUCT_HUNT_HOSTNAMES.has(
			url.hostname.toLowerCase(),
		)
	)
		return undefined;

	return url.pathname.match(
		PRODUCT_HUNT_PRODUCT_PATH,
	)?.[1];
}

function getString(
	value: unknown,
): string | undefined {
	return typeof value === "string" &&
		value.trim()
		? value.trim()
		: undefined;
}

function getHttpsUrl(
	value: unknown,
): string | undefined {
	const url = getString(value);
	if (!url) return undefined;
	try {
		return new URL(url).protocol ===
			"https:"
			? url
			: undefined;
	} catch {
		return undefined;
	}
}

function getUpvoteCount(
	value: unknown,
): number | undefined {
	return typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 0
		? value
		: undefined;
}

function getMetadata(
	post: NonNullable<
		NonNullable<
			ProductHuntGraphQLResponse["data"]
		>["post"]
	>,
): PageItemLinkMetadata | undefined {
	const upvoteCount = getUpvoteCount(
		post.votesCount,
	);
	if (upvoteCount === undefined)
		return undefined;

	const title = getString(post.name);
	const description = getString(
		post.tagline,
	);
	const imageUrl = getHttpsUrl(
		post.thumbnail?.url,
	);
	return {
		...(title ? { title } : {}),
		...(description
			? { description }
			: {}),
		...(imageUrl ? { imageUrl } : {}),
		providerData: { upvoteCount },
	};
}

export function createProductHuntEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return async (url, context) => {
		const slug =
			getProductHuntProductSlug(url);
		const token =
			context.env?.PRODUCT_HUNT_TOKEN?.trim();
		if (!slug || !token)
			return fallbackEnrich(
				url,
				context,
			);

		const controller =
			new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			PRODUCT_HUNT_TIMEOUT_MS,
		);
		try {
			const response =
				await context.fetch(
					PRODUCT_HUNT_API_URL,
					{
						method: "POST",
						headers: {
							Accept:
								"application/json",
							Authorization: `Bearer ${token}`,
							"Content-Type":
								"application/json",
						},
						body: JSON.stringify({
							query:
								"query ($slug: String!) { post(slug: $slug) { name tagline votesCount thumbnail { url } } }",
							variables: { slug },
						}),
						signal: controller.signal,
					},
				);
			if (!response.ok)
				return fallbackEnrich(
					url,
					context,
				);

			const payload =
				(await response.json()) as ProductHuntGraphQLResponse;
			if (payload.errors?.length)
				return fallbackEnrich(
					url,
					context,
				);

			const metadata = payload.data
				?.post
				? getMetadata(payload.data.post)
				: undefined;
			return (
				metadata ??
				fallbackEnrich(url, context)
			);
		} catch {
			return fallbackEnrich(
				url,
				context,
			);
		} finally {
			clearTimeout(timeout);
		}
	};
}
