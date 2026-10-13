"use client";

import { Button } from "@grabbin/ui/components/button";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

// Backup of the removed demo entry in the landing hero.
export default function HeroDemoSectionBackup() {
	const reduceMotion = useReducedMotion();
	const [isVisible, setIsVisible] = useState(false);
	const transition = {
		duration: reduceMotion ? 0 : 0.8,
		delay: reduceMotion ? 0 : 1.35,
		ease: [0.23, 1, 0.32, 1] as const,
	};

	return (
		<motion.div
			className="absolute top-0 left-1/2 z-20 flex h-[52px] -translate-x-1/2 items-start justify-center rounded-b-[32px] bg-background px-3"
			initial={reduceMotion ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={transition}
			onAnimationComplete={() => setIsVisible(true)}
			inert={!isVisible}
		>
			<div
				className="absolute top-0 -left-[31px] h-8 w-8"
				style={{
					background:
						"radial-gradient(circle at 0% 100%, transparent 32px, var(--color-background) 32.5px)",
				}}
			/>
			<div
				className="absolute top-0 -right-[31px] h-8 w-8"
				style={{
					background:
						"radial-gradient(circle at 100% 100%, transparent 32px, var(--color-background) 32.5px)",
				}}
			/>
			<Button
				className="rounded-full px-6"
				size="xl"
				nativeButton={false}
				render={<Link href="/demo">Try demo</Link>}
				variant="secondary"
			/>
		</motion.div>
	);
}
