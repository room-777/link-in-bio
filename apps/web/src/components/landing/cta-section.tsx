import { cn } from "@grabbin/ui/lib/utils";
import JoinForFreeButton from "@/components/landing/join-for-free-button";

export default function CtaSection({ className }: { className?: string }) {
	return (
		<section
			aria-labelledby="landing-cta-title"
			className={cn(
				"flex min-h-[70svh] w-full flex-col items-center justify-center gap-8 px-6 py-28 sm:py-36",
				className,
			)}
		>
			<h2
				id="landing-cta-title"
				className="text-pretty text-center font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
			>
				<span className="block">Bring everything together.</span>
				<span className="block">Make it feel like you.</span>
			</h2>
			<div className="flex flex-row items-center gap-2">
				<JoinForFreeButton
					variant="brandBlack"
					size="lg"
					className="h-10 w-auto shrink-0 px-4 text-sm sm:text-base"
				/>
			</div>
		</section>
	);
}
