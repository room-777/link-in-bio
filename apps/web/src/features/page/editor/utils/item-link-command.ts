import type { BentoItem } from "@/features/page/bento-item";
import type { BentoCommand } from "@/features/page/editor/types";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

type UpdateDataCommand = Extract<BentoCommand, { type: "update-data" }>;

export function createItemLinkCommand(
	item: BentoItem,
	rawValue: string,
): UpdateDataCommand | null {
	const value = rawValue.trim();
	if (item.type !== "link" && item.type !== "text" && item.type !== "media") {
		return null;
	}

	const normalizedUrl = normalizeHttpsUrl(value);
	if (item.type === "link") {
		if (!normalizedUrl || normalizedUrl === item.data.url) return null;
		return {
			type: "update-data",
			itemId: item.id,
			data: { url: normalizedUrl },
		};
	}

	if (!normalizedUrl) {
		if (value || !item.data.url) return null;
		return {
			type: "update-data",
			itemId: item.id,
			data: { ...item.data, url: undefined },
		};
	}
	if (normalizedUrl === item.data.url) return null;
	return {
		type: "update-data",
		itemId: item.id,
		data: { ...item.data, url: normalizedUrl },
	};
}
