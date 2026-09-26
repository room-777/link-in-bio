import { Playfair_Display } from "next/font/google";
import HeroEntrance from "@/components/landing/hero-entrance";
import HeroImage from "@/components/landing/hero-image";

const playfairDisplay = Playfair_Display({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-playfair-display",
});

export default function HeroSection() {
	return (
		<section className="relative isolate flex min-h-svh w-full flex-col px-6 pt-24 pb-20 sm:px-10">
			<HeroImage />
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-background to-transparent"
			/>
			<div aria-hidden="true" className="h-[68px] shrink-0 sm:h-14" />
			<HeroEntrance
				title={
					<h1 className="mx-auto max-w-6xl text-pretty text-center font-medium text-3xl text-primary-foreground leading-tight tracking-[-0.065em] sm:text-4xl md:text-5xl lg:text-[56px]">
						<span className="block">Your link in bio.</span>
						<span className="block">Made to feel like you.</span>
					</h1>
				}
				description={
					<p className="mx-auto mt-4 max-w-md text-pretty text-center font-medium text-lg text-primary-foreground leading-tighter sm:text-xl">
						Bring your links, photos, social profiles, and favorite places
						together on a page you can shape your way.
					</p>
				}
				preview={
					<div className="relative mx-auto mt-20 h-[22rem] w-[min(82vw,22rem)]">
						<div
							aria-hidden="true"
							className="bento-item-card smooth-shadow-ring-xl smooth-ring-neutral-300/30 absolute inset-0 translate-x-4 -translate-y-3 rotate-[4deg] rounded-2xl bg-background shadow-neutral-800"
						/>
						<div className="bento-item-card smooth-shadow-ring-xl smooth-ring-neutral-300/30 absolute inset-0 translate-x-3 -translate-y-2 -rotate-[2deg] overflow-hidden rounded-2xl bg-background shadow-neutral-800">
							<div className="flex size-full flex-col p-8">
								<span
									aria-hidden="true"
									className={`${playfairDisplay.variable} -my-6 font-playfair text-[128px] text-muted-foreground/40 leading-none`}
								>
									“
								</span>
								<p className="-mt-8 whitespace-pre-wrap rounded-lg bg-transparent p-2 text-left font-medium text-xl leading-7 transition-colors hover:bg-background">
									Are your links scattered across different places?
									<br />
									<br />
									Does sharing them one by one—and keeping each link up to
									date—feel like a chore?
								</p>
							</div>
						</div>
					</div>
				}
			/>
		</section>
	);
}
