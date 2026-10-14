import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UpdateMedia } from "@/components/updates/update-media";
import {
	featuredUpdateSlugs,
	getUpdatesByCategory,
	getUpdatesBySlugs,
} from "@/lib/updates";

const title = "Link in Bio Guides & Product Updates | Grabbin";
const description =
	"Practical guides to link-in-bio pages, Instagram and TikTok bios, and portfolio websites, plus the latest Grabbin product updates.";

const groups = getUpdatesByCategory();
const featured = getUpdatesBySlugs(featuredUpdateSlugs);

const categoryIntro: Record<string, string> = {
	Product: "New features and changes to Grabbin.",
	"Link in bio basics":
		"What a link-in-bio page is, how to build a visual one, and how to compare tools.",
	"Instagram & TikTok bio":
		"Write, edit, and link your social bios so visitors know where to go next.",
	"Link in bio by profession":
		"Page ideas for photographers, writers, musicians, designers, and other creators.",
	"Portfolio & personal websites":
		"Plan, design, and publish a personal site or portfolio that shows your work.",
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

export const metadata: Metadata = {
	title,
	description,
	alternates: { canonical: "/update" },
	openGraph: {
		title,
		description,
		url: "/update",
		siteName: "Grabbin",
		type: "website",
	},
	twitter: { card: "summary", title, description },
};

export const revalidate = false;

const formatDate = (date: string) =>
	new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00Z`));

export default function UpdatesPage() {
	return (
		<main className="mx-auto min-h-svh max-w-5xl px-5 pt-40 pb-24 font-open-runde">
			<header className="mx-auto max-w-xl text-center">
				<h1 className="text-balance font-medium text-4xl tracking-[-0.04em]">
					Guides & updates
				</h1>
				<p className="mx-auto mt-4 max-w-md text-pretty px-5 font-medium text-base text-muted-foreground/80 leading-6">
					{description}
				</p>
			</header>
			<section
				aria-label="About these guides"
				className="mx-auto mt-10 max-w-2xl space-y-4 text-pretty text-muted-foreground text-sm leading-6"
			>
				<p>
					A link in bio is the one address you can share on Instagram, TikTok,
					and other profiles. These guides explain how to choose what goes on
					that page, how to write a bio that points people to it, and when a
					visual page or a full portfolio website is the better fit.
				</p>
				<p>
					Grabbin lets you arrange links, photos, videos, text, and places as
					blocks on one bento-style page, and connect your own domain on Pro.
					Every guide is written to be useful whichever tool you pick.
				</p>
				<nav aria-label="Categories" className="flex flex-wrap gap-2 pt-2">
					{groups.map(({ category }) => (
						<a
							key={category}
							href={`#${slugify(category)}`}
							className="rounded-md bg-muted px-2 py-1 text-primary/80 text-xs"
						>
							{category}
						</a>
					))}
				</nav>
			</section>
			<section
				aria-labelledby="featured-heading"
				id="featured"
				className="mt-20"
			>
				<h2
					id="featured-heading"
					className="font-medium text-2xl tracking-[-0.03em]"
				>
					Featured guides
				</h2>
				<ul className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
					{featured.map((update) => (
						<li key={update.slug}>
							<Link
								href={`/update/${update.slug}`}
								className="block rounded-md bg-muted/60 p-4"
							>
								<h3 className="font-medium text-base leading-6">
									{update.title}
								</h3>
								<p className="mt-1 text-pretty text-muted-foreground/80 text-sm leading-5">
									{update.description}
								</p>
							</Link>
						</li>
					))}
				</ul>
			</section>
			{groups.map(({ category, updates }) => (
				<section
					key={category}
					id={slugify(category)}
					aria-labelledby={`${slugify(category)}-heading`}
					className="mt-20 scroll-mt-32"
				>
					<h2
						id={`${slugify(category)}-heading`}
						className="font-medium text-2xl tracking-[-0.03em]"
					>
						{category}
					</h2>
					<p className="mt-2 text-muted-foreground/80 text-sm">
						{categoryIntro[category]}
					</p>
					<div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
						{updates.map((update) => (
							<article key={update.slug}>
								<div className="mb-4 flex items-center justify-between gap-3 text-sm">
									<span className="text-muted-foreground/80">
										{update.type}
									</span>
									<div className="flex items-center gap-2 text-muted-foreground/80">
										<div className="size-5 rounded-full outline-depth">
											<Image
												src={update.author.image}
												alt=""
												width={20}
												height={20}
												loading="lazy"
												quality={65}
												sizes="20px"
												className="size-full rounded-[inherit] object-cover"
											/>
										</div>
										<time dateTime={update.date}>
											{formatDate(update.date)}
										</time>
									</div>
								</div>
								<Link href={`/update/${update.slug}`} className="group block">
									<div className="rounded-md outline-depth">
										<UpdateMedia
											thumbnail={update.thumbnail}
											className="drop-shadow-xs"
										/>
									</div>
									<h3 className="mt-3 font-medium text-base leading-6">
										{update.title}
									</h3>
									<p className="mt-2 text-pretty text-muted-foreground/80 text-sm leading-5">
										{update.description}
									</p>
								</Link>
							</article>
						))}
					</div>
				</section>
			))}
		</main>
	);
}
