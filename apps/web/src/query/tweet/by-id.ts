import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Tweet as TweetResponse } from "react-tweet/api";

export function getTweetQueryOptions(tweetId: string) {
	return queryOptions({
		queryKey: ["tweet", tweetId],
		queryFn: async ({ signal }) => {
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
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useTweetQuery(tweetId: string, enabled: boolean) {
	return useQuery({ ...getTweetQueryOptions(tweetId), enabled });
}
