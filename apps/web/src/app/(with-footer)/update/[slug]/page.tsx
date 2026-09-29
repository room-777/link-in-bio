import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import CtaSection from "@/components/landing/cta-section";
import MdxContent from "@/components/mdx/mdx-content";
import {
	UpdateAuthor,
	UpdateMedia,
} from "@/components/updates/update-components";
import { getUpdate, updates } from "@/lib/updates";

export const revalidate = false;

export function generateStaticParams() {
	return updates.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
	params,
}: PageProps<"/update/[slug]">): Promise<Metadata> {
	const { slug } = await params;
	const update = getUpdate(slug);
	if (!update) return { title: "Update not found | Grabbin" };
	const image =
		update.thumbnail.type === "image"
			? update.thumbnail.src
			: update.thumbnail.poster;
	return {
		title: `${update.title} | Grabbin`,
		description: update.description,
		alternates: { canonical: `/update/${update.slug}` },
		openGraph: {
			title: update.title,
			description: update.description,
			url: `/update/${update.slug}`,
			siteName: "Grabbin",
			type: "article",
			publishedTime: new Date(`${update.date}T00:00:00Z`).toISOString(),
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: update.title,
			description: update.description,
			images: [image],
		},
	};
}

export default async function UpdateDetailPage({
	params,
}: PageProps<"/update/[slug]">) {
	const { slug } = await params;
	const update = getUpdate(slug);
	if (!update) notFound();
	const { Content } = update;

	return (
		<main className="open-runde px-5 pt-36 sm:pt-40">
			<article className="mx-auto max-w-5xl">
				<header className="mx-auto max-w-xl text-center">
					<p className="text-muted-foreground/80 text-sm">
						<time
							dateTime={update.date}
							className="rounded-md bg-muted p-1 px-2 text-sm"
						>
							{new Intl.DateTimeFormat("en", {
								dateStyle: "medium",
								timeZone: "UTC",
							}).format(new Date(`${update.date}T00:00:00Z`))}
						</time>
					</p>
					<h1 className="mt-4 text-balance font-medium text-4xl tracking-[-0.04em]">
						{update.title}
					</h1>
					<p className="mx-auto mt-4 max-w-md text-pretty px-5 font-medium text-base text-muted-foreground/80 leading-6">
						{update.description}
					</p>
					<div className="mt-7 flex justify-center">
						<UpdateAuthor author={update.author} />
					</div>
				</header>
				<div className="mt-12 rounded-xl outline-depth sm:mt-16">
					<UpdateMedia
						thumbnail={update.thumbnail}
						controls
						className="max-h-[70vh] rounded-xl"
					/>
				</div>
				<div className="prose prose-neutral dark:prose-invert mx-auto mt-12 max-w-xl px-5 text-primary/70 sm:mt-16">
					<MdxContent Content={Content} />
				</div>
				<div className="mx-auto max-w-xl">
					<div className="relative isolate mt-40 flex flex-col items-center gap-5">
						<Image
							alt=""
							aria-hidden="true"
							className="pointer-events-none z-10 w-36"
							height={1254}
							sizes="144px"
							src="/images/landing/features-flower.png"
							width={1254}
						/>
						<CtaSection className="min-h-0 w-full gap-5 rounded-xl py-0! [&_h2]:text-2xl sm:[&_h2]:text-3xl" />
					</div>
				</div>
			</article>
		</main>
	);
}
