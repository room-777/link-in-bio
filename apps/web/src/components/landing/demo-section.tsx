"use client";

import { Button } from "@grabbin/ui/components/button";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const DemoEditorPreview = dynamic(() => import("./demo-editor-preview"), {
	ssr: false,
	loading: () => <div className="h-full animate-pulse bg-muted" />,
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
				className="mb-12 text-center font-medium text-4xl tracking-[-0.06em] sm:text-5xl"
				initial={reduceMotion ? false : { opacity: 0 }}
				whileInView={{ opacity: 1 }}
				viewport={{ once: true, amount: 0.25 }}
				transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
			>
				<span className="block">Try this.</span>
				<span className="block">You will love it.</span>
			</motion.h2>
			<motion.div
				className={`smooth-shadow-ring-sm relative mx-auto w-full max-w-7xl rounded-[2rem] bg-background ${isWide ? "h-[calc(100svh-17rem)] max-h-[calc(100svh-17rem)]" : ""}`}
				initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
				whileInView={{ opacity: 1, scale: 1 }}
				viewport={{ once: true, amount: 0.2 }}
				transition={{ duration: 0.55, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
			>
				{isWide ? (
					<div className="relative h-full w-full overflow-hidden rounded-[2rem]">
						{isNearViewport ? <DemoEditorPreview /> : null}
					</div>
				) : (
					<div className="flex flex-col items-center gap-4 p-4">
						<div className="relative aspect-[8/5] w-full overflow-hidden rounded-[2rem]">
							<Image
								alt="Desktop preview of the interactive demo page"
								className="h-full w-full object-contain"
								fill
								unoptimized
								src="/images/updates/demo-desktop-858998aba3aa.png"
							/>
						</div>
						<Button
							variant="secondary"
							size="xl"
							className="text-muted-foreground/80"
							nativeButton={false}
							render={<Link href="/demo">Open live demo</Link>}
						/>
					</div>
				)}
			</motion.div>
		</section>
	);
}
