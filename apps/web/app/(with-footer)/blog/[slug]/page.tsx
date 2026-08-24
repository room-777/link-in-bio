import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/json-ld";
import { getBlogPost, getBlogPosts } from "@/lib/content";
import { createBlogPostingJsonLd } from "@/lib/seo/json-ld";
import {
  createMetadata,
  DEFAULT_SITE_NAME,
  DEFAULT_SOCIAL_IMAGE,
} from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return createMetadata({
      title: "Blog",
      description: "Grabbin guides",
      canonicalPath: "/blog",
    });
  }

  return createMetadata({
    title: post.title,
    description: post.description,
    canonicalPath: `/blog/${encodeURIComponent(post.slug)}`,
    image: post.image ?? DEFAULT_SOCIAL_IMAGE,
    type: "article",
    publishedTime: post.published.toISOString(),
    keywords: [post.category ?? "link in bio", "creator tips"],
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const Post = post.Component;
  const canonicalPath = `/blog/${encodeURIComponent(post.slug)}`;
  const image = post.image ?? DEFAULT_SOCIAL_IMAGE;
  const jsonLd = createBlogPostingJsonLd({
    title: post.title,
    description: post.description,
    path: canonicalPath,
    publishedTime: post.published.toISOString(),
    image,
    authors: post.authors,
    section: post.category,
    publisher: {
      "@type": "Organization",
      name: DEFAULT_SITE_NAME,
      url: "https://grabbin.me",
    },
  });

  return (
    <>
      <JsonLd nodes={[jsonLd]} />
      <main className="legal-document flex flex-col items-center px-5 pt-40 pb-24">
        <article className="w-full max-w-xl px-5">
          <header className="mb-12 flex flex-col gap-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{post.category ?? "Guides"}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.published.toISOString()}>
                {formatDate(post.published)}
              </time>
            </div>
            <h1 className="text-4xl leading-10 font-medium tracking-[-0.04em] text-foreground">
              {post.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {post.description}
            </p>
          </header>

          <div className="legal-markdown mt-16">
            <Post />
          </div>
        </article>
      </main>
    </>
  );
}
