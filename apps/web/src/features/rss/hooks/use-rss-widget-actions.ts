import type { WidgetPreview } from "@grabbin/api";
import { toast } from "@grabbin/ui/components/toast";
import { useCallback, useRef } from "react";
import type { useBentoStore } from "@/features/page/editor/state/bento-store";
import { getErrorMessage } from "@/lib/error-message";
import { useRssFeedPreviewMutation } from "../mutations/preview";

type DispatchCommand = ReturnType<typeof useBentoStore>["dispatchCommand"];

export function useRssWidgetActions(dispatchCommand: DispatchCommand) {
	const previewMutation = useRssFeedPreviewMutation();
	const requestRef = useRef<{
		url: string;
		promise: Promise<WidgetPreview<"rss">>;
	} | null>(null);
	const getRssPreview = useCallback(
		(url: string) => {
			const cached = requestRef.current;
			if (cached?.url === url) return cached.promise;

			const request = previewMutation.mutateAsync({ url }).catch((error) => {
				if (requestRef.current?.promise === request) requestRef.current = null;
				throw error;
			});
			requestRef.current = { url, promise: request };
			return request;
		},
		[previewMutation.mutateAsync],
	);
	const previewRssFeed = useCallback(
		async (url: string) => (await getRssPreview(url)).feed,
		[getRssPreview],
	);
	const addRssFeed = useCallback(
		async (url: string) => {
			try {
				const parsedUrl = new URL(url.trim());
				if (parsedUrl.protocol !== "https:") {
					throw new Error("Enter a supported RSS feed URL.");
				}
				const preview = await getRssPreview(parsedUrl.toString());
				dispatchCommand({
					type: "add-widget",
					widget: { type: "rss", data: preview },
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
		[getRssPreview, dispatchCommand],
	);

	return { addRssFeed, previewRssFeed };
}
