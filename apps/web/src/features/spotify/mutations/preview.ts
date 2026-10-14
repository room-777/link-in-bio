import { pageItemSpotifyPreviewResponseSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function getBentoSpotifyPreview(handle: string, url: string) {
	const response = await apiClient.pages[":handle"].metadata.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ kind: "spotify", url }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageItemSpotifyPreviewResponseSchema, await response.json())
		.metadata;
}

export function useFetchBentoSpotifyPreviewMutation() {
	return useMutation({
		mutationFn: ({ handle, url }: { handle: string; url: string }) =>
			getBentoSpotifyPreview(handle, url),
	});
}
