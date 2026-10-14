import { widgetPreviewResponseSchema } from "@grabbin/api";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Tweet as TweetResponse } from "react-tweet/api";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function getTweetById(tweetId: string, signal: AbortSignal) {
	const response = await apiClient.widgets.preview.$post(undefined, {
		init: {
			body: JSON.stringify({
				kind: "tweet",
				url: `https://x.com/i/status/${tweetId}`,
			}),
			headers: { "Content-Type": "application/json" },
			signal,
		},
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const result = v.parse(widgetPreviewResponseSchema, await response.json());
	if (result.kind !== "tweet") throw new Error("Unable to load this Tweet.");
	return result.data.tweet as TweetResponse;
}

function getTweetQueryOptions(tweetId: string) {
	return queryOptions({
		queryKey: ["tweet", tweetId],
		queryFn: ({ signal }) => getTweetById(tweetId, signal),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useTweetQuery(tweetId: string, enabled: boolean) {
	return useQuery({ ...getTweetQueryOptions(tweetId), enabled });
}

export function useLoadTweet() {
	const queryClient = useQueryClient();
	return useCallback(
		(tweetId: string) => queryClient.fetchQuery(getTweetQueryOptions(tweetId)),
		[queryClient],
	);
}
