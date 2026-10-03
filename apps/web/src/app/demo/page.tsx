import type { Metadata } from "next";
import Link from "next/link";
import OwnerPage from "@/components/page/editor/owner-page";
import { DEMO_PAGE_RESPONSE } from "@/lib/demo-page";

const title = "Interactive Link in Bio Demo | Grabbin";
const description =
	"Explore a sample Grabbin page with social links, photos, videos, notes, and places on a map. See how one flexible page can bring your online presence together.";

export const metadata: Metadata = {
	title,
	description,
	alternates: { canonical: "/demo" },
	openGraph: {
		title,
		description,
		url: "/demo",
		siteName: "Grabbin",
		type: "website",
	},
	twitter: { card: "summary", title, description },
};

export default function DemoPage() {
	return (
		<>
			<OwnerPage pageResponse={DEMO_PAGE_RESPONSE} demoMode />
			<section aria-labelledby="demo-description-title" className="sr-only">
				<article>
					<h1 id="demo-description-title">
						Explore an interactive Grabbin page demo
					</h1>
					<div className="mx-auto mt-6 max-w-2xl space-y-4 text-center text-muted-foreground leading-7">
						<p>
							This sample shows how a creator can bring social profiles, photos,
							videos, notes, and favorite places together on one link in bio
							page.
						</p>
						<p>
							Explore the page above to see its flexible blocks and layouts.
							Each page can be arranged to fit the person behind it, then shared
							with a single link.
						</p>
					</div>
					<nav
						aria-label="Explore Grabbin"
						className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 font-medium"
					>
						<Link className="underline underline-offset-4" href="/">
							Learn about Grabbin
						</Link>
						<Link className="underline underline-offset-4" href="/create">
							Create your page
						</Link>
					</nav>
				</article>
			</section>
		</>
	);
}
