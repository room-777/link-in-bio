import type { PageItemResponse } from "@grabbin/api";
import type { PresetName } from "@grabbin/bento-layout";

export type BentoItem = PageItemResponse & {
	preset: PresetName | null;
};

export function toBentoItem(item: PageItemResponse): BentoItem {
	return { ...item, preset: null };
}
