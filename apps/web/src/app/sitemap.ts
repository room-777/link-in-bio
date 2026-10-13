import type { MetadataRoute } from "next";
import { fetchSitemapHandles } from "@/lib/server/page-query";
import { updates } from "@/lib/updates";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const profileHandles = await fetchSitemapHandles();
	return ["/", "/privacy", "/terms", "/sign-in", "/demo", "/update"]
		.map((path) => ({ url: new URL(path, "https://grabbin.me").toString() }))
		.concat(
			updates.map(({ slug, date }) => ({
				url: new URL(`/update/${slug}`, "https://grabbin.me").toString(),
				lastModified: new Date(`${date}T00:00:00Z`),
			})),
			profileHandles.map((handle) => ({
				url: new URL(
					encodeURIComponent(handle),
					"https://grabbin.me/",
				).toString(),
			})),
		);
}
