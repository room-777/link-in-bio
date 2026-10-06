import type { MDXContent } from "mdx/types.js";
import MdxContent from "@/components/mdx/mdx-content";

type LegalPageProps = {
	Document: MDXContent;
	title: string;
	description: string;
	lastUpdated: string;
};

export default function LegalPage({
	Document,
	title,
	description,
	lastUpdated,
}: LegalPageProps) {
	return (
		<main className="legal-document flex flex-col items-center px-5 pt-40 pb-24 font-open-runde">
			<article className="w-full max-w-xl px-5">
				<header className="flex flex-col items-center text-center">
					<h1 className="font-medium text-4xl text-foreground leading-10 tracking-[-0.04em]">
						{title}
					</h1>
					<p className="mt-4 max-w-sm text-center text-muted-foreground text-sm leading-5">
						{description}
					</p>
					<time className="mt-4 inline-flex h-7 items-center rounded-md bg-muted px-2.5 text-muted-foreground text-sm leading-5">
						Last updated {lastUpdated}
					</time>
				</header>
				<div className="legal-markdown mt-16">
					<MdxContent Content={Document} />
				</div>
			</article>
		</main>
	);
}
