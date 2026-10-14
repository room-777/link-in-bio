import type { MetadataRoute } from "next";
import { makeQueryClient } from "@/lib/query-client";
import { getUpdateLastModified, updates } from "@/lib/updates";
import { getSitemapHandlesQueryOptions } from "@/query/page/sitemap-handles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const profileHandles = await makeQueryClient().query(
		getSitemapHandlesQueryOptions(),
	);
	const latestUpdate = updates
		.map(getUpdateLastModified)
		.reduce((a, b) => (a > b ? a : b));
	return ["/", "/privacy", "/terms", "/sign-in", "/demo", "/update"]
		.map((path) => ({
			url: new URL(path, "https://grabbin.me").toString(),
			...(path === "/update" ? { lastModified: latestUpdate } : {}),
		}))
		.concat(
			updates.map((update) => ({
				url: new URL(`/update/${update.slug}`, "https://grabbin.me").toString(),
				lastModified: getUpdateLastModified(update),
			})),
			profileHandles.map((handle) => ({
				url: new URL(
					encodeURIComponent(handle),
					"https://grabbin.me/",
				).toString(),
			})),
		);
}
