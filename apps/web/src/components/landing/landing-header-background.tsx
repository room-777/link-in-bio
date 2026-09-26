"use client";

import { useEffect, useState } from "react";

export default function LandingHeaderBackground() {
	const [hasPassedHero, setHasPassedHero] = useState(false);

	useEffect(() => {
		const hero = document.getElementById("hero");
		if (!hero) return;

		const observer = new IntersectionObserver(([entry]) => {
			setHasPassedHero(!entry.isIntersecting);
		});
		observer.observe(hero);

		return () => observer.disconnect();
	}, []);

	return (
		<>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-white transition-opacity"
				style={{ opacity: hasPassedHero ? 1 : 0 }}
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-white to-transparent transition-opacity"
				style={{ opacity: hasPassedHero ? 1 : 0 }}
			/>
		</>
	);
}
