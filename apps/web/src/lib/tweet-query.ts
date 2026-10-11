import type { Tweet as TweetResponse } from "react-tweet/api";

export function tweetQueryOptions(tweetId: string) {
	return {
		queryKey: ["tweet", tweetId],
		queryFn: async ({ signal }: { signal: AbortSignal }) => {
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
	};
}
