import { getBlogPosts } from "@/lib/content";
import { getSiteOrigin } from "@/lib/seo-responses";

export function GET() {
  const siteOrigin = getSiteOrigin();
  const toAbsoluteUrl = (path: string) => new URL(path, siteOrigin).toString();
  const posts = getBlogPosts();
  const lines = [
    "# Grabbin",
    "",
    "Grabbin is a flexible link in bio service for presenting your identity, links, media, and favorite places in one personal page.",
    "",
    "## Key Resources",
    "",
    "- Home: " +
      toAbsoluteUrl("/") +
      "\n  Overview of the link in bio service and its main features.",
    "- Blog: " +
      toAbsoluteUrl("/blog") +
      "\n  Link in bio guides for creators and small businesses.",
    ...posts.map(
      (post) =>
        `- ${post.title}: ${toAbsoluteUrl(`/blog/${encodeURIComponent(post.slug)}`)}\n  ${post.description}`,
    ),
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
