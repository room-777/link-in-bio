import type { MetadataRoute } from "next";
import { fetchSitemapHandles } from "@/lib/server/page-query";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
	const profileHandles = await fetchSitemapHandles();
	return {
		rules: {
			userAgent: "*",
			allow: ["/", ...profileHandles.map((handle) => `/${handle}`)],
			disallow: "/create",
		},
		sitemap: "https://grabbin.me/sitemap.xml",
	};
}
