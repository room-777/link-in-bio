"use client";

import { Button } from "@grabbin/ui/components/button";
import Image from "next/image";
import { useEffect } from "react";

export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="relative isolate grid min-h-svh place-items-center bg-background px-6 py-16 text-center">
			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 aspect-[1.25/1] w-full overflow-hidden sm:aspect-[5/1]">
				<Image
					alt=""
					aria-hidden="true"
					fill
					loading="lazy"
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					unoptimized
					className="select-none object-cover object-bottom"
				/>
			</div>
			<section className="relative z-10 flex flex-col items-center">
				<h1 className="mb-4 font-semibold text-[clamp(4.5rem,13vw,6.25rem)] text-primary/90 leading-none tracking-tight">
					500
				</h1>
				<p className="max-w-xs text-pretty text-primary/80 text-sm leading-6">
					Something went wrong. Please try again.
				</p>
				<Button
					className="mt-6 text-muted-foreground"
					variant="secondary"
					size="default"
					onClick={reset}
				>
					Try again
				</Button>
			</section>
		</main>
	);
}
