"use client";

import { useEffect, useRef, useState } from "react";

export type ClipboardCopyState = "idle" | "copied" | "error";

export function useClipboardCopy(resetAfterMs = 1800) {
	const [copyState, setCopyState] = useState<ClipboardCopyState>("idle");
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const resetTimer = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
		},
		[],
	);

	const copyText = async (value: string, key: string) => {
		if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
		try {
			await navigator.clipboard.writeText(value);
			setCopyState("copied");
			setCopiedKey(key);
			resetTimer.current = window.setTimeout(() => {
				setCopyState("idle");
				setCopiedKey(null);
				resetTimer.current = null;
			}, resetAfterMs);
			return true;
		} catch {
			setCopyState("error");
			setCopiedKey(null);
			return false;
		}
	};

	return { copyState, copiedKey, copyText };
}
