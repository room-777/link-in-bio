import { widgetPreviewResponseSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function getSpotifyWidgetPreview(url: string) {
	const response = await apiClient.widgets.preview.$post(undefined, {
		init: {
			body: JSON.stringify({ kind: "spotify", url }),
			headers: { "Content-Type": "application/json" },
		},
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = v.parse(widgetPreviewResponseSchema, await response.json());
	if (result.kind !== "spotify") throw new Error("Unexpected widget preview.");
	return result.data;
}

export function useSpotifyWidgetPreviewMutation() {
	return useMutation({
		mutationFn: ({ url }: { url: string }) => getSpotifyWidgetPreview(url),
	});
}
