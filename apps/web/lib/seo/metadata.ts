import type { Metadata } from "next";

export const DEFAULT_SEO_DESCRIPTION =
  "Create a beautiful link in bio page with your links, media, and favorite places.";
export const DEFAULT_SITE_NAME = "Grabbin";
export const HOME_TITLE =
  "A Link in Bio, the most beautiful and clean you've ever seen";
export const DEFAULT_SOCIAL_IMAGE = "/opengraph-image";

type PageMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  includeSiteName?: boolean;
  noIndex?: boolean;
  image?: string;
  keywords?: string[];
  type?: "website" | "article";
  publishedTime?: string;
};

export function createMetadata(input: PageMetadataInput): Metadata {
  const image = input.image ? [{ url: input.image }] : undefined;
  const title =
    input.includeSiteName === false
      ? input.title
      : `${input.title} | ${DEFAULT_SITE_NAME}`;

  return {
    title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: input.canonicalPath },
    openGraph: {
      title,
      description: input.description,
      type: input.type ?? "website",
      url: input.canonicalPath,
      images: image,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
    robots: {
      index: !input.noIndex,
      follow: !input.noIndex,
    },
  };
}

export function createHomeMetadata() {
  return createMetadata({
    title: HOME_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    canonicalPath: "/",
    includeSiteName: false,
    image: DEFAULT_SOCIAL_IMAGE,
    keywords: [
      "link in bio",
      "personal page",
      "creator page",
      "social links",
      "online profile",
    ],
  });
}
