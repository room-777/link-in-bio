import { cn } from "@grabbin/ui/lib/utils";
import JoinForFreeButton from "@/components/landing/join-for-free-button";

export default function CtaSection({ className }: { className?: string }) {
	return (
		<section
			aria-labelledby="landing-cta-title"
			className={cn("mx-auto w-full max-w-5xl px-5 pt-16 md:px-0", className)}
		>
			<div className="flex flex-col items-center gap-5 rounded-3xl bg-secondary/60 px-8 py-8 md:py-16">
				<h2
					id="landing-cta-title"
					className="max-w-md text-balance text-center font-medium text-4xl text-fg-4 leading-12 tracking-tight"
				>
					Bring everything together in one page
				</h2>
				<p className="w-full max-w-sm text-center font-medium text-muted-foreground">
					Create your page for today and bring your work, links, and story
					together in one place.
				</p>
				<div className="flex flex-row items-center gap-2">
					<JoinForFreeButton
						variant="brand"
						size="lg"
						className="h-12 w-auto shrink-0 rounded-3xl px-5 text-sm sm:text-base"
					>
						Create your page
					</JoinForFreeButton>
				</div>
			</div>
		</section>
	);
}
