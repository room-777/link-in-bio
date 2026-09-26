"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function HeroEntrance({
	title,
	description,
	preview,
}: {
	title: ReactNode;
	description: ReactNode;
	preview: ReactNode;
}) {
	const reduceMotion = useReducedMotion();
	const transition = {
		duration: reduceMotion ? 0 : 0.9,
		ease: [0.22, 1, 0.36, 1] as const,
	};
	const initial = reduceMotion
		? false
		: { opacity: 0, y: 12, filter: "blur(4px)" };
	const animate = { opacity: 1, y: 0, filter: "blur(0px)" };

	return (
		<div className="relative z-10 mx-auto w-full max-w-7xl">
			<motion.div animate={animate} initial={initial} transition={transition}>
				{title}
			</motion.div>
			<motion.div
				animate={animate}
				initial={initial}
				transition={{ ...transition, delay: 0.15 }}
			>
				{description}
			</motion.div>
			<motion.div
				animate={animate}
				initial={initial}
				transition={{ ...transition, delay: 0.3 }}
			>
				{preview}
			</motion.div>
		</div>
	);
}
