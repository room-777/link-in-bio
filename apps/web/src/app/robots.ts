import type { MetadataRoute } from "next";
import { makeQueryClient } from "@/lib/query-client";
import { getSitemapHandlesQueryOptions } from "@/query/page/sitemap-handles";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
	const profileHandles = await makeQueryClient().query(
		getSitemapHandlesQueryOptions(),
	);
	return {
		rules: {
			userAgent: "*",
			allow: ["/", ...profileHandles.map((handle) => `/${handle}`)],
			disallow: "/create",
		},
		sitemap: "https://grabbin.me/sitemap.xml",
	};
}
