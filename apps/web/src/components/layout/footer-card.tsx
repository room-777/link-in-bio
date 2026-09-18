import { div as MotionDiv } from "motion/react-client";
import type { ReactNode } from "react";

type FooterCardProps = {
	children: ReactNode;
	delay?: number;
	rotation: number;
};

export default function FooterCard({
	children,
	delay = 0,
	rotation,
}: FooterCardProps) {
	return (
		<MotionDiv
			initial={{ opacity: 0, scale: 0.7, y: 16, rotate: rotation * 2.25 }}
			whileInView={{
				opacity: 1,
				scale: [0.7, 1.08, 1],
				y: 0,
				rotate: rotation,
			}}
			whileHover={{ y: -8 }}
			viewport={{ once: true, amount: 0.35 }}
			transition={{
				duration: 0.6,
				ease: [0.22, 1, 0.36, 1],
				delay,
			}}
		>
			{children}
		</MotionDiv>
	);
}
