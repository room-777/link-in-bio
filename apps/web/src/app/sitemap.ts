import type { MetadataRoute } from "next";
import { fetchSitemapHandles } from "@/lib/server/page-query";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const profileHandles = await fetchSitemapHandles();
	return ["/", "/privacy", "/terms", "/sign-in", "/demo"]
		.map((path) => ({ url: new URL(path, "https://grabbin.me").toString() }))
		.concat(
			profileHandles.map((handle) => ({
				url: new URL(
					encodeURIComponent(handle),
					"https://grabbin.me/",
				).toString(),
			})),
		);
}
