import { PlanPicker } from "@/components/billing/plan-dialog";

export default function PlanSection() {
	return (
		<section
			aria-labelledby="landing-plan-title"
			className="w-full px-6 py-24 sm:px-10 sm:py-32"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 sm:gap-14">
				<div className="grid gap-3 text-center">
					<h2
						id="landing-plan-title"
						className="text-pretty font-medium text-3xl text-foreground leading-tight tracking-[-0.065em] sm:text-4xl lg:text-5xl"
					>
						More room for everything you share.
					</h2>
					<p className="text-pretty text-muted-foreground sm:text-lg">
						Start free. Upgrade to Pro for more pages and a page without the
						Grabbin watermark.
					</p>
				</div>
				<div className="w-full max-w-md">
					<PlanPicker />
				</div>
			</div>
		</section>
	);
}
