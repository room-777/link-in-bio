import type { Metadata, Route } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/json-ld";
import { getBlogPosts } from "@/lib/content";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";

const BLOG_TITLE = "Link in Bio Tips for Creators and Small Businesses";
const BLOG_DESCRIPTION =
  "Practical guides for creating a better link in bio page, growing your audience, and turning social traffic into meaningful action.";

export const metadata: Metadata = createMetadata({
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  canonicalPath: "/blog",
  image: DEFAULT_SOCIAL_IMAGE,
  keywords: ["link in bio tips", "Instagram bio links", "creator marketing"],
});

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export default function BlogPage() {
  const posts = getBlogPosts();
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: BLOG_TITLE,
    url: "https://grabbin.me/blog",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: `https://grabbin.me/blog/${encodeURIComponent(post.slug)}`,
      })),
    },
  };

  return (
    <>
      <JsonLd
        nodes={[
          createWebPageJsonLd({
            title: BLOG_TITLE,
            description: BLOG_DESCRIPTION,
            path: "/blog",
          }),
          collectionJsonLd,
        ]}
      />
      <main className="flex flex-col items-center pb-32">
        <header className="flex w-full flex-col items-center justify-center gap-4 px-5 pt-40 pb-16">
          <p className="text-sm text-muted-foreground">Grabbin guides</p>
          <h1 className="max-w-2xl text-center text-4xl font-medium leading-tight text-fg-4 sm:text-5xl">
            {BLOG_TITLE}
          </h1>
          <p className="max-w-xl text-center text-base leading-7 text-muted-foreground">
            {BLOG_DESCRIPTION}
          </p>
        </header>

        <section className="grid w-full max-w-5xl grid-cols-1 gap-4 px-5 sm:grid-cols-2">
          {posts.map((post) => (
            <article
              className="surface-line rounded-3xl p-6 transition-transform hover:-translate-y-1"
              key={post.slug}
            >
              <Link
                className="flex h-full flex-col gap-5"
                href={`/blog/${encodeURIComponent(post.slug)}` as Route}
              >
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span>{post.category ?? "Guides"}</span>
                  <time dateTime={post.published.toISOString()}>
                    {formatDate(post.published)}
                  </time>
                </div>
                <h2 className="text-xl font-medium leading-tight text-fg-4">
                  {post.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {post.description}
                </p>
                <span className="mt-auto text-sm font-medium text-fg-4">
                  Read guide →
                </span>
              </Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
