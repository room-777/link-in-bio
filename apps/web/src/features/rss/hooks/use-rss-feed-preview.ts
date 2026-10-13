import type { RssFeedResponse } from "@grabbin/api";
import { useEffect, useState } from "react";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

export function useRssFeedPreview(
	inputValue: string,
	onPreview: (url: string) => Promise<RssFeedResponse>,
) {
	const [feed, setFeed] = useState<RssFeedResponse>();

	useEffect(() => {
		if (!inputValue.trim()) {
			setFeed(undefined);
			return;
		}

		let isCurrent = true;
		setFeed(undefined);
		const previewUrl = normalizeHttpsUrl(inputValue);
		if (!previewUrl) return;

		void onPreview(previewUrl)
			.then((nextFeed) => {
				if (isCurrent) setFeed(nextFeed);
			})
			.catch(() => {});
		return () => {
			isCurrent = false;
		};
	}, [inputValue, onPreview]);

	return feed;
}
