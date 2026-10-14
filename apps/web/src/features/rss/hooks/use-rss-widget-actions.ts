import type { RssFeedResponse } from "@grabbin/api";
import { providerIconUrl } from "@grabbin/page-link";
import { toast } from "@grabbin/ui/components/toast";
import { useCallback, useRef } from "react";
import type { useBentoStore } from "@/features/page/editor/state/bento-store";
import { getErrorMessage } from "@/lib/error-message";
import { useRssFeedPreviewMutation } from "../mutations/preview";

type DispatchCommand = ReturnType<typeof useBentoStore>["dispatchCommand"];

export function useRssWidgetActions(
	handle: string,
	dispatchCommand: DispatchCommand,
) {
	const previewMutation = useRssFeedPreviewMutation();
	const requestRef = useRef<{
		handle: string;
		url: string;
		promise: Promise<RssFeedResponse>;
	} | null>(null);
	const getRssFeed = useCallback(
		(url: string) => {
			const cached = requestRef.current;
			if (cached?.handle === handle && cached.url === url)
				return cached.promise;

			const request = previewMutation
				.mutateAsync({ handle, url })
				.catch((error) => {
					if (requestRef.current?.promise === request)
						requestRef.current = null;
					throw error;
				});
			requestRef.current = { handle, url, promise: request };
			return request;
		},
		[handle, previewMutation.mutateAsync],
	);
	const previewRssFeed = useCallback(
		(url: string) => getRssFeed(url),
		[getRssFeed],
	);
	const addRssFeed = useCallback(
		async (url: string) => {
			try {
				const parsedUrl = new URL(url.trim());
				if (parsedUrl.protocol !== "https:") {
					throw new Error("Enter a supported RSS feed URL.");
				}
				const normalizedUrl = parsedUrl.toString();

				const rss = await getRssFeed(normalizedUrl);
				const addedItem = dispatchCommand({
					type: "add-item",
					itemType: "link",
					url: normalizedUrl,
				});
				if (addedItem?.type !== "link") return false;

				dispatchCommand({
					type: "update-data",
					itemId: addedItem.id,
					data: {
						...addedItem.data,
						metadata: {
							title: "RSS Feed",
							faviconUrl: providerIconUrl("rss-feed"),
							provider: "rss-feed",
							rss,
						},
					},
				});
				return true;
			} catch (error) {
				toast({
					message: getErrorMessage(error, "Enter a supported RSS feed URL."),
					state: "error",
				});
				return false;
			}
		},
		[getRssFeed, dispatchCommand],
	);

	return { addRssFeed, previewRssFeed };
}
