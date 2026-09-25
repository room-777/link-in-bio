"use client";

import { Button } from "@grabbin/ui/components/button";
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
		<main className="grid min-h-svh place-items-center bg-background px-6 py-16 text-center">
			<section className="flex flex-col items-center">
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
