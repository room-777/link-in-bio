import type { MDXContent } from "mdx/types";
import AddMultipleLinks, {
  frontmatter as addMultipleLinksFrontmatter,
} from "../../frontend/src/mdx/post/how-to-add-multiple-links-instagram-bio.mdx";
import OptimizeLink, {
  frontmatter as optimizeLinkFrontmatter,
} from "../../frontend/src/mdx/post/how-to-optimize-link-in-bio-for-more-clicks.mdx";
import InstagramBio, {
  frontmatter as instagramBioFrontmatter,
} from "../../frontend/src/mdx/post/instagram-bio-examples-for-business.mdx";
import CreatorIdeas, {
  frontmatter as creatorIdeasFrontmatter,
} from "../../frontend/src/mdx/post/link-in-bio-ideas-for-creators.mdx";
import SeoGuide, {
  frontmatter as seoGuideFrontmatter,
} from "../../frontend/src/mdx/post/link-in-bio-seo-guide.mdx";
import LinkInBioVsWebsite, {
  frontmatter as linkInBioVsWebsiteFrontmatter,
} from "../../frontend/src/mdx/post/link-in-bio-vs-personal-website.mdx";
import WhatIsLinkInBio, {
  frontmatter as whatIsLinkInBioFrontmatter,
} from "../../frontend/src/mdx/post/what-is-a-link-in-bio.mdx";
import Privacy, {
  frontmatter as privacyFrontmatter,
} from "../../frontend/src/mdx/privacy/privacy.mdx";
import Terms, {
  frontmatter as termsFrontmatter,
} from "../../frontend/src/mdx/terms/terms.mdx";

function requiredString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing MDX frontmatter field: ${key}`);
  }
  return value.trim();
}

function optionalString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredDate(data: Record<string, unknown>, key: string) {
  const value = data[key];
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid MDX frontmatter date: ${key}`);
  }
  return date;
}

function requiredAuthors(data: Record<string, unknown>) {
  const value = data.authors;
  if (
    !Array.isArray(value) ||
    value.some((author) => typeof author !== "string")
  ) {
    throw new Error("Missing MDX frontmatter field: authors");
  }
  return value;
}

export type BlogPost = {
  authors: string[];
  category?: string;
  Component: MDXContent;
  description: string;
  image?: string;
  published: Date;
  slug: string;
  title: string;
};

type BlogSource = {
  Component: MDXContent;
  data: Record<string, unknown>;
  slug: string;
};

type LegalSource = {
  Component: MDXContent;
  data: Record<string, unknown>;
};

const blogSources = [
  {
    Component: AddMultipleLinks,
    data: addMultipleLinksFrontmatter,
    slug: "how-to-add-multiple-links-instagram-bio",
  },
  {
    Component: OptimizeLink,
    data: optimizeLinkFrontmatter,
    slug: "how-to-optimize-link-in-bio-for-more-clicks",
  },
  {
    Component: InstagramBio,
    data: instagramBioFrontmatter,
    slug: "instagram-bio-examples-for-business",
  },
  {
    Component: CreatorIdeas,
    data: creatorIdeasFrontmatter,
    slug: "link-in-bio-ideas-for-creators",
  },
  {
    Component: SeoGuide,
    data: seoGuideFrontmatter,
    slug: "link-in-bio-seo-guide",
  },
  {
    Component: LinkInBioVsWebsite,
    data: linkInBioVsWebsiteFrontmatter,
    slug: "link-in-bio-vs-personal-website",
  },
  {
    Component: WhatIsLinkInBio,
    data: whatIsLinkInBioFrontmatter,
    slug: "what-is-a-link-in-bio",
  },
] satisfies readonly BlogSource[];

function getBlogPostFromSource({
  Component,
  data,
  slug,
}: BlogSource): BlogPost {
  return {
    authors: requiredAuthors(data),
    category: optionalString(data, "category"),
    Component,
    description: requiredString(data, "description"),
    image: optionalString(data, "image"),
    published: requiredDate(data, "published"),
    slug,
    title: requiredString(data, "title"),
  };
}

export function getBlogPosts() {
  return blogSources
    .map(getBlogPostFromSource)
    .sort((a, b) => b.published.getTime() - a.published.getTime());
}

export function getBlogPost(slug: string) {
  return getBlogPosts().find((post) => post.slug === slug);
}

export type LegalDocument = {
  Component: MDXContent;
  description: string;
  lastUpdated: string;
  title: string;
};

const legalDocuments = {
  privacy: { Component: Privacy, data: privacyFrontmatter },
  terms: { Component: Terms, data: termsFrontmatter },
} satisfies Record<"privacy" | "terms", LegalSource>;

export function getLegalDocument(name: "privacy" | "terms"): LegalDocument {
  const { Component, data } = legalDocuments[name];

  return {
    Component,
    description: requiredString(data, "description"),
    lastUpdated: requiredString(data, "lastUpdated"),
    title: requiredString(data, "title"),
  };
}
