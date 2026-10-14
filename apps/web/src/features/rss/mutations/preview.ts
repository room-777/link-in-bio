import { widgetPreviewResponseSchema } from "@grabbin/api";
import { providerIconUrl } from "@grabbin/page-link";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function getRssFeedPreview(url: string) {
	const response = await apiClient.widgets.preview.$post(undefined, {
		init: {
			body: JSON.stringify({ kind: "rss", url }),
			headers: { "Content-Type": "application/json" },
		},
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = v.parse(widgetPreviewResponseSchema, await response.json());
	if (result.kind !== "rss") throw new Error("Unexpected widget preview.");
	const { feed } = result.data;
	return {
		...result.data,
		feed: {
			...feed,
			source: {
				...feed.source,
				iconUrl: providerIconUrl(
					feed.source.platform,
					feed.source.platform === "ghost" ? "webp" : "svg",
				),
			},
		},
	};
}

export function useRssFeedPreviewMutation() {
	return useMutation({
		mutationFn: ({ url }: { url: string }) => getRssFeedPreview(url),
	});
}
