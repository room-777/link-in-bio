import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";
import { SpotifyWidget } from "./spotify-widget";

type SpotifyWidgetItem = Extract<PageItemResponse, { type: "spotify" }>;

export default function SpotifyItem({
	item,
	preset,
}: {
	item: SpotifyWidgetItem;
	preset: PresetName;
}) {
	return <SpotifyWidget item={item} preset={preset} />;
}

export { SpotifyItem };
