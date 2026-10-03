import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UpdateMedia } from "@/components/updates/update-components";
import { updates } from "@/lib/updates";

const description =
	"Read product news, feature releases, and behind-the-scenes notes about building your Grabbin page.";

export const metadata: Metadata = {
	title: "Updates | Grabbin",
	description,
	alternates: { canonical: "/update" },
	openGraph: {
		title: "Updates | Grabbin",
		description,
		url: "/update",
		siteName: "Grabbin",
		type: "website",
	},
	twitter: { card: "summary", title: "Updates | Grabbin", description },
};

export const revalidate = false;

const formatDate = (date: string) =>
	new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00Z`));

export default function UpdatesPage() {
	return (
		<main className="open-runde mx-auto min-h-svh max-w-5xl px-5 pt-40 pb-24">
			<header className="text-center">
				<h1 className="font-medium text-3xl leading-10 tracking-[-0.04em]">
					Updates
				</h1>
				<p className="mt-3 text-muted-foreground text-sm">{description}</p>
			</header>
			<section
				aria-label="Latest updates"
				className="mt-16 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3"
			>
				{updates.map((update) => (
					<article key={update.slug}>
						<div className="mb-4 flex items-center justify-between gap-3 text-sm">
							<span className="text-muted-foreground/80">{update.type}</span>
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
								<time dateTime={update.date}>{formatDate(update.date)}</time>
							</div>
						</div>
						<Link href={`/update/${update.slug}`} className="group block">
							<div className="rounded-md outline-depth">
								<UpdateMedia
									thumbnail={update.thumbnail}
									className="drop-shadow-xs"
								/>
							</div>
							<h2 className="mt-3 font-medium text-base leading-6">
								{update.title}
							</h2>
							<p className="mt-2 text-pretty text-muted-foreground/80 text-sm leading-5">
								{update.description}
							</p>
						</Link>
					</article>
				))}
			</section>
		</main>
	);
}
