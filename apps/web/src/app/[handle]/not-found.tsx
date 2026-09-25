import { Button } from "@grabbin/ui/components/button";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="relative isolate grid min-h-svh place-items-center overflow-x-clip bg-background px-6 py-16 text-center">
			<section className="z-10 flex flex-col items-center">
				<h1 className="mb-4 font-semibold text-[clamp(4.5rem,13vw,6.25rem)] text-primary/90 leading-none tracking-tight">
					404
				</h1>
				<p className="max-w-xs text-pretty text-primary/80 text-sm leading-6">
					We&apos;ve looked everywhere, but couldn&apos;t find what you were
					looking for. It may have moved or been removed.
				</p>
				<Button
					className="mt-6 text-muted-foreground"
					variant="secondary"
					size="default"
					nativeButton={false}
					render={<Link href="/" />}
				>
					Go home
				</Button>
			</section>
		</main>
	);
}
