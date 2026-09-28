import type { MDXContent } from "mdx/types.js";

export type UpdateFrontmatter = {
	type: string;
	date: string;
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
