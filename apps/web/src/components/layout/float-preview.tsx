"use client";

import { motion, useReducedMotion } from "motion/react";

const floatItems = [
	{ color: "bg-rose-300", delay: 0, left: "14%", top: "34%" },
	{ color: "bg-sky-300", delay: -1.2, left: "31%", top: "20%" },
	{ color: "bg-lime-300", delay: -2.4, left: "48%", top: "34%" },
	{ color: "bg-amber-300", delay: -3.6, left: "64%", top: "22%" },
	{ color: "bg-violet-300", delay: -4.8, left: "40%", top: "50%" },
] as const;

export default function FloatPreview({
	visible = true,
	wideOnly = false,
}: {
	visible?: boolean;
	wideOnly?: boolean;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.section
			aria-label="Floating item preview"
			aria-hidden={!visible}
			className={`relative hidden min-h-96 items-center justify-center overflow-hidden px-6 py-12 ${wideOnly ? "min-[90rem]:flex min-[90rem]:min-h-svh" : "lg:flex lg:min-h-svh"}`}
			initial={false}
			animate={{ opacity: visible ? 1 : 0 }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { type: "spring", duration: 0.55, bounce: 0.15 }
			}
		>
			<div className="relative h-72 w-full max-w-lg sm:h-96">
				{floatItems.map((item) => (
					<motion.div
						animate={
							reduceMotion
								? { y: 0, rotate: -4 }
								: { y: [0, -18, 0], rotate: [-4, 4, -4] }
						}
						className="absolute"
						initial={reduceMotion ? false : { y: 0, rotate: -4 }}
						key={item.color}
						style={{ left: item.left, top: item.top }}
						transition={
							reduceMotion
								? { duration: 0 }
								: {
										delay: item.delay,
										duration: 5,
										ease: "easeInOut",
										repeat: Number.POSITIVE_INFINITY,
									}
						}
					>
						<div
							aria-hidden="true"
							className={`aspect-square size-40 rounded-xl ${item.color} smooth-shadow-lg outline-depth`}
						/>
					</motion.div>
				))}
			</div>
		</motion.section>
	);
}
