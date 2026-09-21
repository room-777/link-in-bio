import {
	hasPageItemContent,
	type PageItemBatchRequest,
	type PageItemResponse,
} from "@grabbin/api";
import type { BentoBatchItem, BentoItem } from "./bento-types";

type LinkResponse = Extract<PageItemResponse, { type: "link" }>;

function toRequestMetadata(metadata: LinkResponse["data"]["metadata"]) {
	if (!metadata) return undefined;
	const { presentation: _presentation, ...requestMetadata } = metadata;
	return requestMetadata;
}

export function toBentoItem(item: PageItemResponse): BentoItem {
	return { ...item, preset: null };
}

export function toBatchItem(item: BentoItem): BentoBatchItem {
	const base = {
		id: item.id,
		style: item.style,
		layouts: item.layouts,
		updatedAt: item.updatedAt,
	};

	switch (item.type) {
		case "text":
			return { ...base, type: item.type, data: item.data };
		case "media":
			return {
				...base,
				type: item.type,
				data: {
					objectKey: item.data.objectKey,
					mimeType: item.data.mimeType,
					...(item.data.caption !== undefined
						? { caption: item.data.caption }
						: {}),
					...(item.data.link !== undefined ? { link: item.data.link } : {}),
				},
			};
		case "map":
			return { ...base, type: item.type, data: item.data };
		case "section":
			return { ...base, type: item.type, data: item.data };
		case "link": {
			const metadata = toRequestMetadata(item.data.metadata);
			return {
				...base,
				type: item.type,
				data: {
					url: item.data.url,
					...(metadata ? { metadata } : {}),
				},
			};
		}
	}
}

function sameItem(left: BentoBatchItem, right: BentoBatchItem | undefined) {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function createBentoBatch(
	items: readonly BentoItem[],
	persisted: readonly BentoItem[],
	deletedIds: ReadonlySet<string>,
): PageItemBatchRequest {
	const persistedById = new Map(
		persisted.map((item) => [item.id, toBatchItem(item)]),
	);

	return {
		upserts: items
			.filter(
				(item) => item.type !== "media" || item.data.objectKey !== "pending",
			)
			.map(toBatchItem)
			.filter(hasPageItemContent)
			.filter((item) => !sameItem(item, persistedById.get(item.id))),
		deletes: [...deletedIds].filter((id) => persistedById.has(id)),
	};
}

export function restoreEmptyBentoItems(
	items: readonly BentoItem[],
	persisted: readonly BentoItem[],
) {
	const persistedById = new Map(persisted.map((item) => [item.id, item]));
	return items.flatMap((item) => {
		if (hasPageItemContent(toBatchItem(item))) return [item];
		const persistedItem = persistedById.get(item.id);
		return persistedItem ? [persistedItem] : [];
	});
}

export function hasBentoBatchChanges(batch: PageItemBatchRequest) {
	return batch.upserts.length > 0 || batch.deletes.length > 0;
}

export function mergeBentoItems<T extends { id: string }>(
	current: readonly T[],
	incoming: readonly T[],
) {
	const incomingById = new Map(incoming.map((item) => [item.id, item]));
	const currentIds = new Set(current.map((item) => item.id));
	return [
		...current.map((item) => incomingById.get(item.id) ?? item),
		...incoming.filter((item) => !currentIds.has(item.id)),
	];
}

export function mergeAcknowledgedBentoItems(
	draft: readonly BentoItem[],
	acknowledged: readonly BentoItem[],
	batch: PageItemBatchRequest,
) {
	const sentById = new Map(batch.upserts.map((item) => [item.id, item]));
	const acknowledgedById = new Map(acknowledged.map((item) => [item.id, item]));

	return draft.map((item) => {
		const sentItem = sentById.get(item.id);
		const acknowledgedItem = acknowledgedById.get(item.id);
		if (
			!sentItem ||
			!acknowledgedItem ||
			!sameItem(toBatchItem(item), sentItem)
		) {
			return item;
		}
		if (
			item.type === "media" &&
			acknowledgedItem.type === "media" &&
			!acknowledgedItem.data.mediaUrl &&
			item.data.mediaUrl?.startsWith("blob:")
		) {
			return {
				...acknowledgedItem,
				data: { ...acknowledgedItem.data, mediaUrl: item.data.mediaUrl },
			};
		}
		return acknowledgedItem;
	});
}
