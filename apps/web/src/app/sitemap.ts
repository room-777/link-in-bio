import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
	return ["", "/privacy", "/terms", "/demo"].map((path) => ({
		url: new URL(path, "https://grabbin.me").toString(),
	}));
}
