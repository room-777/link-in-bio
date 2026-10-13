import type { MetadataRoute } from "next";
import { makeQueryClient } from "@/lib/query-client";
import { updates } from "@/lib/updates";
import { getSitemapHandlesQueryOptions } from "@/query/page/sitemap-handles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const profileHandles = await makeQueryClient().query(
		getSitemapHandlesQueryOptions(),
	);
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
