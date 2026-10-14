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
}) => new Date(`${update.updated ?? update.date}T00:00:00Z`);

export const getUpdatesByCategory = () =>
	updateCategories
		.map((category) => ({
			category,
			updates: updates.filter((update) => update.category === category),
		}))
		.filter((group) => group.updates.length > 0);

export const getRelatedUpdates = (slug: string, limit = 4) => {
	const current = getUpdate(slug);
	if (!current) return [];
	return updates
		.filter(
			(update) => update.slug !== slug && update.category === current.category,
		)
		.slice(0, limit);
};
