"use client";

import { Button } from "@grabbin/ui/components/button";
import { ExpandIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const DemoEditorPreview = dynamic(() => import("./demo-editor-preview"), {
	ssr: false,
	loading: () => <div className="h-full animate-pulse bg-white" />,
});

export default function DemoSection() {
	const [isWide, setIsWide] = useState(false);
	const [isNearViewport, setIsNearViewport] = useState(false);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		const media = window.matchMedia("(min-width: 48rem)");
		const update = () => setIsWide(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		const section = document.getElementById("demo");
		if (!section) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting || entry.intersectionRatio < 0.4) return;
				setIsNearViewport(true);
				observer.disconnect();
			},
			{ threshold: 0.4 },
		);
		observer.observe(section);
		return () => observer.disconnect();
	}, []);

	return (
		<section
			aria-label="Interactive demo"
			className="relative my-16 flex min-h-svh w-full flex-col justify-center overflow-visible px-4 py-12 sm:px-8 sm:py-16"
			id="demo"
		>
			<motion.h2
				className="mb-2 text-center font-medium text-4xl tracking-[-0.06em] sm:text-5xl"
				initial={reduceMotion ? false : { opacity: 0 }}
				whileInView={{ opacity: 1 }}
				viewport={{ once: true, amount: 0.25 }}
				transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
			>
				See your page take shape.
			</motion.h2>
			<p className="mb-12 text-center text-muted-foreground sm:text-lg">
				Try this. You will love it.
			</p>
			<motion.div
				className={`smooth-shadow-ring-sm relative mx-auto flex w-full max-w-7xl flex-col rounded-3xl bg-secondary p-2 ${isWide ? "h-[calc(100svh-8rem)] max-h-[calc(100svh-17rem)]" : ""}`}
				initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
				whileInView={{ opacity: 1, scale: 1 }}
				viewport={{ once: true, amount: 0.2 }}
				transition={{ duration: 0.55, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
			>
				{isNearViewport ? (
					<div className="smooth-shadow-ring-xs flex flex-row items-center justify-between rounded-t-2xl bg-background p-1 px-2 pl-4">
						<aside className="flex flex-row items-center gap-1.5">
							<span className="h-3 w-3 rounded-full bg-[#F87171]" />
							<span className="h-3 w-3 rounded-full bg-[#FACC15]" />
							<span className="h-3 w-3 rounded-full bg-[#4ADE80]" />
						</aside>
						<aside className="font-medium text-muted-foreground/60 text-sm">
							grabbin.me/avery_reed
						</aside>
						<aside>
							<Button
								variant={"ghost"}
								size={"icon"}
								nativeButton={false}
								render={
									<Link href={"/demo"}>
										<ExpandIcon className="size-5" />
									</Link>
								}
							/>
						</aside>
					</div>
				) : null}
				{isWide ? (
					<div className="smooth-shadow-ring-xs relative min-h-0 w-full flex-1 overflow-hidden rounded-b-2xl">
						{isNearViewport ? <DemoEditorPreview /> : null}
					</div>
				) : (
					<div className="smooth-shadow-ring-xs flex flex-col items-center gap-4 rounded-b-2xl bg-background p-4">
						<div className="relative aspect-[8/5] w-full overflow-hidden">
							<Image
								alt="Desktop preview of the interactive demo page"
								className="h-full w-full object-contain"
								fill
								loading="lazy"
								quality={60}
								sizes="calc(100vw - 3rem)"
								src="/images/updates/demo-desktop-858998aba3aa.png"
							/>
						</div>
					</div>
				)}
			</motion.div>
		</section>
	);
}
