import type { MDXContent } from "mdx/types.js";

export const updateCategories = [
	"Product",
	"Link in bio basics",
	"Instagram & TikTok bio",
	"Link in bio by profession",
	"Portfolio & personal websites",
] as const;

export type UpdateCategory = (typeof updateCategories)[number];

export type UpdateFrontmatter = {
	showInUpdates?: boolean;
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

const priorityRank = (slug: string) => {
	const index = relatedPriority.indexOf(slug);
	return index === -1 ? relatedPriority.length : index;
};

export const featuredUpdateSlugs = [
	"instagram-bio-character-limit",
	"how-to-add-link-instagram-bio",
	"tiktok-link-in-bio-eligibility",
	"free-linktree-alternatives",
	"build-visual-link-in-bio",
	"what-is-link-in-bio",
];

export const homeGuideSlugs = [
	"build-visual-link-in-bio",
	"free-linktree-alternatives",
	"what-is-link-in-bio",
	"instagram-bio-character-limit",
	"choose-link-in-bio-tool",
	"your-page-your-domain",
	"what-grabbin-gives-you",
];

export const getUpdatesBySlugs = (slugs: string[]) =>
	slugs.flatMap((slug) => {
		const update = getUpdate(slug);
		return update ? [update] : [];
	});

/** Pinned guides first (in priority order), then same-category posts by date. */
export const getRelatedUpdates = (slug: string, limit = 4) => {
	const current = getUpdate(slug);
	if (!current) return [];
	return updates
		.filter(
			(update) =>
				update.slug !== slug &&
				(update.category === current.category ||
					relatedPriority.includes(update.slug)),
		)
		.map((update, index) => ({ update, index }))
		.sort(
			(a, b) =>
				priorityRank(a.update.slug) - priorityRank(b.update.slug) ||
				a.index - b.index,
		)
		.slice(0, limit)
		.map(({ update }) => update);
};
