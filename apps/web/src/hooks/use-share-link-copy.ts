"use client";

import { useClipboardCopy } from "@/hooks/use-clipboard-copy";
import { trackGoogleAnalyticsEvent } from "@/lib/google-analytics";

export function useShareLinkCopy() {
	const { copyState, copyText } = useClipboardCopy();
	const copyLink = async () => {
		const copied = await copyText(window.location.href, "share-link");
		if (copied) trackGoogleAnalyticsEvent("profile_share");
		return copied;
	};

	return { copyState, copyLink };
}
