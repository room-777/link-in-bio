import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

type UpdateDataCommand = Extract<BentoCommand, { type: "update-data" }>;

export function createItemLinkCommand(
	item: BentoItem,
	rawValue: string,
): UpdateDataCommand | null {
	const value = rawValue.trim();
	if (item.type === "link") {
		const normalizedUrl = normalizeHttpsUrl(value);
		if (!normalizedUrl || normalizedUrl === item.data.url) return null;
		return {
			type: "update-data",
			itemId: item.id,
			data: { url: normalizedUrl },
		};
	}

	if (item.type !== "text" && item.type !== "media") return null;
	if (!value) {
		if (!item.data.url) return null;
		return {
			type: "update-data",
			itemId: item.id,
			data: { ...item.data, url: undefined },
		};
	}
	const normalizedUrl = normalizeHttpsUrl(value);
	if (!normalizedUrl || normalizedUrl === item.data.url) return null;
	return {
		type: "update-data",
		itemId: item.id,
		data: { ...item.data, url: normalizedUrl },
	};
}
