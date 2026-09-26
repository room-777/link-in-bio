"use client";

import { useEffect, useRef } from "react";

const REEL_SPINS = 3;
const REEL_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const REEL_SEQUENCE = Array.from(
	{ length: (REEL_SPINS + 1) * REEL_DIGITS.length },
	(_, index) => REEL_DIGITS[index % REEL_DIGITS.length],
);

export default function SpinningCounter({ value }: { value: number }) {
	const digitString = String(value);
	const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

	useEffect(() => {
		for (const strip of stripRefs.current) {
			if (!strip) continue;
			strip.style.transition = "none";
			strip.style.transform = "translateY(0)";
			void strip.offsetHeight;
		}

		const frame = requestAnimationFrame(() => {
			for (const [index, strip] of stripRefs.current.entries()) {
				if (!strip) continue;
				const styles = getComputedStyle(strip);
				const cellSize =
					Number.parseFloat(styles.getPropertyValue("--reel-cell")) || 30;
				const stagger =
					Number.parseFloat(styles.getPropertyValue("--reel-stagger")) || 90;
				const digit = Number(digitString[index] ?? 0);

				strip.style.transition = `transform var(--reel-dur) var(--reel-ease) ${index * stagger}ms`;
				strip.style.transform = `translateY(-${(REEL_SPINS * 10 + digit) * cellSize}px)`;
			}
		});

		return () => cancelAnimationFrame(frame);
	}, [digitString]);

	return (
		<span className="t-reel" aria-hidden="true">
			{[...digitString].map((_, index) => (
				<span className="t-reel-col" key={`reel-${index.toString(36)}`}>
					<span
						className="t-reel-strip"
						ref={(element) => {
							stripRefs.current[index] = element;
						}}
					>
						{REEL_SEQUENCE.map((digit, sequenceIndex) => (
							<span
								className="t-reel-digit"
								key={`${digit}-${Math.floor(sequenceIndex / REEL_DIGITS.length)}`}
							>
								{digit}
							</span>
						))}
					</span>
				</span>
			))}
		</span>
	);
}
