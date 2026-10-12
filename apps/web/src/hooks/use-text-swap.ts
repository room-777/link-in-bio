"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useTextSwap(value: string) {
	const [displayedValue, setDisplayedValue] = useState(value);
	const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
	const elementRef = useRef<HTMLSpanElement>(null);
	const swapTimerRef = useRef<number | null>(null);
	const frameRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		if (value === displayedValue) return;

		if (swapTimerRef.current !== null)
			window.clearTimeout(swapTimerRef.current);
		if (frameRef.current !== null)
			window.cancelAnimationFrame(frameRef.current);

		setPhase("exit");
		const duration =
			Number.parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue(
					"--text-swap-dur",
				),
			) || 150;
		swapTimerRef.current = window.setTimeout(() => {
			setDisplayedValue(value);
			setPhase("enter");
			frameRef.current = window.requestAnimationFrame(() => {
				if (elementRef.current) void elementRef.current.offsetHeight;
				setPhase("idle");
				frameRef.current = null;
			});
			swapTimerRef.current = null;
		}, duration);
	}, [displayedValue, value]);

	useEffect(
		() => () => {
			if (swapTimerRef.current !== null)
				window.clearTimeout(swapTimerRef.current);
			if (frameRef.current !== null)
				window.cancelAnimationFrame(frameRef.current);
		},
		[],
	);

	const className = [
		"t-text-swap",
		phase === "exit" && "is-exit",
		phase === "enter" && "is-enter-start",
	]
		.filter(Boolean)
		.join(" ");

	return { displayedValue, elementRef, className };
}
