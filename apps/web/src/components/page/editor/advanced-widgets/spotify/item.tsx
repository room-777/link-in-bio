import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { SpotifyWidget } from "./widget";

type LinkItem = Extract<PageItemResponse, { type: "link" }>;

export function SpotifyItem({
	item,
	preset,
}: {
	item: LinkItem;
	preset: PresetName;
}) {
	if (item.data.metadata?.provider !== "spotify") return null;
	return <SpotifyWidget item={item} preset={preset} />;
}
