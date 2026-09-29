import { Button } from "@grabbin/ui/components/button";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="relative isolate grid min-h-svh place-items-center overflow-x-clip bg-background px-6 py-16 text-center">
			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 aspect-[1.25/1] w-full overflow-hidden sm:aspect-[5/1]">
				<Image
					alt=""
					aria-hidden="true"
					fill
					loading="lazy"
					sizes="100vw"
					quality={55}
					src="/images/footer-doodles-bf164e2b806327c8.png"
					className="select-none object-cover object-bottom"
				/>
			</div>
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
