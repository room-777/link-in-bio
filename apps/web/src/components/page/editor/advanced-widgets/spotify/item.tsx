import type { PageItemResponse } from "@grabbin/api";
import { SpotifyWidget } from "./widget";

type LinkItem = Extract<PageItemResponse, { type: "link" }>;

export function SpotifyItem({ item }: { item: LinkItem }) {
	if (item.data.metadata?.provider !== "spotify") return null;
	return <SpotifyWidget />;
}
