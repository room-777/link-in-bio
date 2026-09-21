import { Button } from "@grabbin/ui/components/button";
import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
			>
				<div className="absolute top-1/2 left-1/2 size-[min(80vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl" />
				<div className="absolute top-1/2 left-1/2 size-[min(70vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/10" />
			</div>

			<section className="smooth-shadow-xs flex w-full max-w-lg flex-col items-center rounded-[2rem] bg-card px-6 py-12 text-center ring-1 ring-foreground/5 sm:px-12 sm:py-16">
				<div className="relative mb-8 flex size-40 items-center justify-center sm:size-48">
					<span className="select-none font-mono font-semibold text-[clamp(6rem,24vw,9rem)] text-primary/10 leading-none tracking-[-0.14em]">
						404
					</span>
					<div className="absolute flex size-16 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-brand/20 shadow-lg outline outline-black/10 -outline-offset-1 sm:size-20">
						<Compass
							aria-hidden="true"
							className="size-8 stroke-[1.75] sm:size-9"
						/>
					</div>
				</div>

				<p className="font-medium text-brand text-xs uppercase tracking-[0.18em]">
					Wrong turn
				</p>
				<h1 className="mt-3 max-w-sm text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
					This page couldn&apos;t be found.
				</h1>
				<p className="mt-4 max-w-sm text-pretty text-muted-foreground leading-6">
					The link may be broken, or this page may have moved somewhere else.
				</p>

				<Button
					className="mt-8 h-11 px-4"
					variant="brand"
					size="lg"
					nativeButton={false}
					render={<Link href="/" />}
				>
					<ArrowLeft aria-hidden="true" />
					Back to grabbin
				</Button>
			</section>
		</main>
	);
}
