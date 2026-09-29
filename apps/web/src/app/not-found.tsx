"use client";

import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import { Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
	const pathname = usePathname().replace("/", "");
	const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN;

	return (
		<main className="open-runde relative isolate grid min-h-svh place-items-center overflow-x-clip bg-background px-6 py-16 text-center">
			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 aspect-[1.5/1] w-full overflow-hidden sm:aspect-[5/1]">
				<Image
					alt=""
					aria-hidden="true"
					width={2171}
					height={724}
					loading="lazy"
					sizes="100vw"
					src="/images/footer-doodles-bf164e2b806327c8.png"
					className="absolute inset-0 h-full w-full select-none object-cover object-bottom"
				/>
			</div>
			<section className="z-10 flex flex-col items-center">
				<h1 className="mb-4 font-semibold text-[clamp(4.5rem,13vw,6.25rem)] text-primary/90 leading-none tracking-tight">
					404
				</h1>
				<div className="my-3 flex max-w-sm items-center gap-2 p-2">
					<div className="smooth-shadow-xs flex aspect-square size-12 items-center justify-center rounded-lg border">
						<Globe className="size-6 -rotate-z-12 stroke-[2] text-foreground" />
					</div>
					<div className="flex h-12 min-w-0 flex-1 items-center justify-center break-all rounded-lg bg-secondary px-2">
						<p className="flex w-full min-w-0 overflow-hidden px-1.5 font-medium text-lg">
							<span className="shrink-0 text-muted-foreground">
								{pageDomain}
							</span>
							<span className="min-w-0 truncate">/{pathname}</span>
						</p>
					</div>
				</div>
				<p className="max-w-2xs text-pretty text-primary/80 text-sm leading-6">
					We&apos;ve looked everywhere, but couldn&apos;t find what you were
					looking for. It may have moved or been removed.
				</p>
				<div className="mt-6 flex flex-row items-center gap-2">
					<Button
						className="text-muted-foreground"
						variant="secondary"
						size="default"
						nativeButton={false}
						render={<Link href="/" />}
					>
						Go home
					</Button>
					<Button
						className=""
						variant="outline"
						size="default"
						nativeButton={false}
						render={<Link href="/sign-in" />}
					>
						or grab it!
					</Button>
				</div>
			</section>
		</main>
	);
}
