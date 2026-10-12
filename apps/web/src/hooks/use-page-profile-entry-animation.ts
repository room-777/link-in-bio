"use client";

import { useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect } from "react";

const PROFILE_ENTRY_START = { opacity: 0, y: 16 };
const PROFILE_ENTRY_END = { opacity: 1, y: 0 };
const PROFILE_ENTRY_TRANSITION = {
	type: "spring" as const,
	duration: 0.55,
	bounce: 0.15,
};
const REDUCED_MOTION_TRANSITION = { duration: 0 };

export function usePageProfileEntryAnimation(
	entryReady: boolean,
	entryAnimationRevision: number,
) {
	const reduceMotion = useReducedMotion();
	const controls = useAnimationControls();
	const transition = reduceMotion
		? REDUCED_MOTION_TRANSITION
		: PROFILE_ENTRY_TRANSITION;

	// A revision change replays the animation after a layout breakpoint change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the revision is an intentional trigger.
	useEffect(() => {
		controls.stop();
		controls.set(
			reduceMotion && entryReady ? PROFILE_ENTRY_END : PROFILE_ENTRY_START,
		);
		if (!entryReady || reduceMotion) return;

		const frame = window.requestAnimationFrame(() => {
			void controls.start(PROFILE_ENTRY_END, transition);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			controls.stop();
		};
	}, [entryAnimationRevision, controls, entryReady, reduceMotion, transition]);

	return {
		initial: reduceMotion ? false : PROFILE_ENTRY_START,
		animate: controls,
		transition,
	};
}
