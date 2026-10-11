import { cn } from "@grabbin/ui/lib/utils";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import LandingCtaGlobe from "@/components/landing/landing-cta-globe";

export default function CtaSection({ className }: { className?: string }) {
	return (
		<section
			aria-labelledby="landing-cta-title"
			className={cn("mx-auto w-full max-w-5xl px-5 pt-16 md:px-0", className)}
		>
			<div className="flex flex-col items-center justify-between gap-12 rounded-[3rem] bg-linear-to-b from-secondary/60 to-white px-6 pt-10 pb-0 sm:px-8 md:pt-12 md:pb-0 lg:gap-6">
				<div className="flex flex-col items-center gap-5">
					<h2
						id="landing-cta-title"
						className="text-balance text-center font-semibold text-3xl text-fg-4 leading-tight tracking-tight sm:text-5xl"
					>
						<span className="block">Create your page.</span>
						<span className="block">Let the world find you.</span>
					</h2>
					<JoinForFreeButton
						variant="brandBlack"
						size="lg"
						className="h-12 w-auto shrink-0 rounded-full px-8"
					>
						Create your page
					</JoinForFreeButton>
				</div>
				<LandingCtaGlobe />
			</div>
		</section>
	);
}
