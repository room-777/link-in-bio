import type { MDXContent } from "mdx/types.js";

const updateCategories = [
	"Product",
	"Link in bio basics",
	"Instagram & TikTok bio",
	"Link in bio by profession",
	"Portfolio & personal websites",
] as const;

export type UpdateCategory = (typeof updateCategories)[number];

export type UpdateFrontmatter = {
	type: string;
	category: UpdateCategory;
	date: string;
	/** Last meaningful content change (YYYY-MM-DD); used for sitemap lastmod. */
	updated?: string;
	faq?: { question: string; answer: string }[];
	title: string;
	description: string;
	thumbnail:
		| { type: "image"; src: string; alt: string }
		| {
				type: "video";
				src: string;
				poster: string;
				alt: string;
				captions: string;
		  };
	author: { name: string; title: string; image: string };
};

const modules = import.meta.glob<{
	default: MDXContent;
	frontmatter: UpdateFrontmatter;
}>("../content/updates/*.mdx", { eager: true });

export const updates = Object.entries(modules)
	.map(([path, module]) => ({
		slug:
			path
				.split("/")
				.at(-1)
				?.replace(/\.mdx$/, "") ?? "",
		Content: module.default,
		...module.frontmatter,
	}))
	.sort((a, b) => b.date.localeCompare(a.date));

export const getUpdate = (slug: string) =>
	updates.find((update) => update.slug === slug);

export const getUpdateLastModified = (update: {
	date: string;
	updated?: string;
	faq?: { question: string; answer: string }[];
}) => new Date(`${update.updated ?? update.date}T00:00:00Z`);

export const getUpdatesByCategory = () =>
	updateCategories
		.map((category) => ({
			category,
			updates: updates.filter((update) => update.category === category),
		}))
		.filter((group) => group.updates.length > 0);

/** Guides that Related guides should surface first (priority order). */
const relatedPriority = [
	"build-visual-link-in-bio",
	"free-linktree-alternatives",
	"instagram-bio-ideas",
	"personal-website-ideas",
	"your-page-your-domain",
	"calendly-widget",
	"artist-portfolio-website",
	"choose-link-in-bio-tool",
	"how-to-add-instagram-to-tiktok-bio",
	"link-in-bio-for-photographers",
	"link-in-bio-for-writers",
	"link-in-bio-instagram",
	"what-is-link-in-bio",
	"what-grabbin-gives-you",
];

export const featuredUpdateSlugs = [
	"instagram-bio-character-limit",
	"how-to-add-link-instagram-bio",
	"tiktok-link-in-bio-eligibility",
	"free-linktree-alternatives",
	"build-visual-link-in-bio",
	"what-is-link-in-bio",
];

export const getUpdatesBySlugs = (slugs: string[]) =>
	slugs.flatMap((slug) => {
		const update = getUpdate(slug);
		return update ? [update] : [];
	});

const hashSlug = (slug: string) => {
	let hash = 0;
	for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return hash;
};

/**
 * Two same-category posts (newest first), then two pinned guides from the
 * priority list rotated by a hash of the current slug, so different posts
 * surface different pinned guides. Skips the current post and duplicates; if
 * pinned candidates run out, remaining slots fall back to same-category posts.
 */
export const getRelatedUpdates = (slug: string, limit = 4) => {
	const current = getUpdate(slug);
	if (!current) return [];
	const sameCategory = updates.filter(
		(update) => update.slug !== slug && update.category === current.category,
	);
	const sameCategorySlots = Math.min(2, sameCategory.length);
	const picked = sameCategory.slice(0, sameCategorySlots);
	const seen = new Set([slug, ...picked.map((update) => update.slug)]);
	const offset = hashSlug(slug) % relatedPriority.length;
	const rotated = [
		...relatedPriority.slice(offset),
		...relatedPriority.slice(0, offset),
	];
	const pinned = getUpdatesBySlugs(
		rotated.filter((pinnedSlug) => !seen.has(pinnedSlug)),
	).slice(0, limit - picked.length);
	const result = [...picked, ...pinned];
	for (const pinnedUpdate of pinned) seen.add(pinnedUpdate.slug);
	for (const update of sameCategory) {
		if (result.length >= limit) break;
		if (!seen.has(update.slug)) {
			result.push(update);
			seen.add(update.slug);
		}
	}
	return result;
};
