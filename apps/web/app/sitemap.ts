import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/content";
import { getSiteOrigin } from "@/lib/seo-responses";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const posts = getBlogPosts();
  const latestPostDate = posts[0]?.published;

  return [
    {
      url: new URL("/", origin).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/log-in", origin).toString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: new URL("/privacy", origin).toString(), priority: 0.2 },
    { url: new URL("/terms", origin).toString(), priority: 0.2 },
    {
      url: new URL("/pricing", origin).toString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: new URL("/blog", origin).toString(),
      ...(latestPostDate ? { lastModified: latestPostDate } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: new URL(`/blog/${encodeURIComponent(post.slug)}`, origin).toString(),
      lastModified: post.published,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
