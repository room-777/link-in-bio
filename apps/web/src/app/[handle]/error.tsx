"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect } from "react";

export default function RouteError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const { reset: resetQuery } = useQueryErrorResetBoundary();

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
			<p className="text-muted-foreground text-sm">
				Something went wrong. Please try again.
			</p>
			<button
				type="button"
				className="rounded-md border px-3 py-2 font-medium text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onClick={() => {
					resetQuery();
					reset();
				}}
			>
				Try again
			</button>
		</main>
	);
}
