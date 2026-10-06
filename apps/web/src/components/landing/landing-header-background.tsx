"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function LandingHeaderBackground({
	children,
}: {
	children: ReactNode;
}) {
	const [isScrolled, setIsScrolled] = useState(false);
	const reduceMotion = useReducedMotion();
	const transition = {
		duration: reduceMotion ? 0 : 0.8,
		ease: [0.22, 1, 0.36, 1] as const,
	};

	useEffect(() => {
		let frame = 0;
		let previousScrollState = window.scrollY > 0;
		setIsScrolled(previousScrollState);

		const updateScrollState = () => {
			if (frame) return;
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				const nextScrollState = window.scrollY > 0;
				if (nextScrollState === previousScrollState) return;
				previousScrollState = nextScrollState;
				setIsScrolled(nextScrollState);
			});
		};

		window.addEventListener("scroll", updateScrollState, { passive: true });

		return () => {
			window.removeEventListener("scroll", updateScrollState);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, []);
	return (
		<motion.header
			className="fixed inset-x-0 top-0 z-100003 px-6 py-2 sm:px-2"
			animate={{ y: isScrolled ? 15 : 0 }}
			transition={transition}
		>
			<motion.div
				initial={false}
				animate={{ maxWidth: isScrolled ? "28rem" : "64rem" }}
				className="relative mx-auto flex w-full items-center justify-between rounded-full px-2 py-2 pl-4"
				transition={{ maxWidth: transition }}
			>
				<motion.div
					aria-hidden="true"
					initial={{ opacity: 0 }}
					className="pointer-events-none absolute inset-0 rounded-full border border-black/8 bg-background shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
					animate={{ opacity: isScrolled ? 1 : 0 }}
					transition={transition}
				/>
				{children}
			</motion.div>
		</motion.header>
	);
}
