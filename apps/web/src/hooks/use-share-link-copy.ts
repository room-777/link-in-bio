"use client";

import { useClipboardCopy } from "@/hooks/use-clipboard-copy";

export function useShareLinkCopy() {
	const { copyState, copyText } = useClipboardCopy();
	const copyLink = () => copyText(window.location.href, "share-link");

	return { copyState, copyLink };
}
