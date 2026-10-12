"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

export function useShareLinkCopy() {
	const [copyState, setCopyState] = useState<CopyState>("idle");
	const resetTimerRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
		},
		[],
	);

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
			setCopyState("copied");
			resetTimerRef.current = window.setTimeout(() => {
				setCopyState("idle");
				resetTimerRef.current = null;
			}, 1800);
			return true;
		} catch {
			setCopyState("error");
			return false;
		}
	};

	return { copyState, copyLink };
}
