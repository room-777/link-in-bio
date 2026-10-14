import Link from "next/link";
import { getUpdatesBySlugs, homeGuideSlugs } from "@/lib/updates";

const guides = getUpdatesBySlugs(homeGuideSlugs);
const horizontalPadding = "px-8 sm:px-16 md:px-20 lg:px-28 xl:px-36 2xl:px-40";

export default function GuidesSection() {
	return (
		<section
			aria-labelledby="landing-guides-title"
			className="w-full py-24 sm:py-32"
		>
			<div
				className={`mx-auto flex w-full max-w-screen-2xl flex-col gap-10 ${horizontalPadding}`}
			>
				<h2
					id="landing-guides-title"
					className="text-balance text-center font-semibold text-[clamp(1.25rem,6.2vw,1.75rem)] leading-tight tracking-tighter sm:text-[clamp(1.75rem,3.5vw,3.25rem)] lg:text-[clamp(2.25rem,3.5vw,3.25rem)]"
				>
					Guides
				</h2>
				<ul className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
					{guides.map((guide) => (
						<li key={guide.slug}>
							<Link href={`/update/${guide.slug}`} className="group block">
								<h3 className="font-medium text-lg leading-6 group-hover:underline">
									{guide.title}
								</h3>
								<p className="mt-2 text-pretty text-muted-foreground/80 text-sm leading-5">
									{guide.description}
								</p>
							</Link>
						</li>
					))}
				</ul>
				<Link
					href="/update"
					className="self-center text-muted-foreground text-sm underline-offset-4 hover:underline"
				>
					All guides
				</Link>
			</div>
		</section>
	);
}
