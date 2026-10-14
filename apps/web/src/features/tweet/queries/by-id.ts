import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Tweet as TweetResponse } from "react-tweet/api";

async function getTweetById(tweetId: string, signal: AbortSignal) {
	const response = await fetch(
		`https://react-tweet.vercel.app/api/tweet/${tweetId}`,
		{ signal },
	);
	if (!response.ok) throw new Error("Unable to load this Tweet.");
	const result = (await response.json()) as { data?: TweetResponse };
	if (!result.data || result.data.id_str !== tweetId) {
		throw new Error("Unable to load this Tweet.");
	}
	return result.data;
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
