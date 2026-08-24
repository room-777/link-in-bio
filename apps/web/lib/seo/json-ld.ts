const SITE_URL = "https://grabbin.me";

export type JsonLdNode = Record<string, unknown>;

function withSiteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createWebSiteJsonLd(input: {
  name: string;
  description?: string;
  path: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: withSiteUrl(input.path),
    ...(input.description ? { description: input.description } : {}),
  };
}

export function createWebPageJsonLd(input: {
  title: string;
  description?: string;
  path: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    url: withSiteUrl(input.path),
    ...(input.description ? { description: input.description } : {}),
  };
}

export function createProfilePageJsonLd(input: {
  title: string;
  handle: string;
  description?: string;
  path: string;
  image?: string;
}): JsonLdNode {
  const url = withSiteUrl(input.path);
  const image = input.image ? withSiteUrl(input.image) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: input.title,
    url,
    ...(input.description ? { description: input.description } : {}),
    mainEntity: {
      "@type": "Person",
      name: input.title,
      alternateName: `@${input.handle}`,
      url,
      ...(input.description ? { description: input.description } : {}),
      ...(image ? { image } : {}),
    },
  };
}

export function createBlogPostingJsonLd(input: {
  title: string;
  description?: string;
  path: string;
  publishedTime: string;
  image?: string;
  authors?: string[];
  section?: string;
  publisher?: Record<string, unknown>;
}): JsonLdNode {
  const image = input.image ? withSiteUrl(input.image) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: withSiteUrl(input.path),
    datePublished: input.publishedTime,
    ...(input.section ? { articleSection: input.section } : {}),
    ...(image ? { image } : {}),
    ...(input.authors?.length
      ? {
          author: input.authors.map((name) => ({
            "@type": "Person",
            name,
          })),
        }
      : {}),
    ...(input.publisher ? { publisher: input.publisher } : {}),
  };
}
