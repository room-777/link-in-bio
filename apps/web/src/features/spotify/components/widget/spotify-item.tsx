import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { SpotifyWidget } from "./spotify-widget";

type LinkItem = Extract<PageItemResponse, { type: "link" }>;

export default function SpotifyItem({
	item,
	preset,
}: {
	item: LinkItem;
	preset: PresetName;
}) {
	return <SpotifyWidget item={item} preset={preset} />;
}

export { SpotifyItem };
