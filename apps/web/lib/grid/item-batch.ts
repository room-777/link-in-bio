import type { PageItemBatchRequest, PageItemResponse } from "@grabbin/api";
import { hasPageItemContent } from "@grabbin/api";
import { inferPresetFromLayouts } from "./layout-engine";
import type { GridItem } from "./types";

type BatchItem = PageItemBatchRequest["upserts"][number];

export function toGridItem(item: PageItemResponse): GridItem {
  return { ...item, preset: inferPresetFromLayouts(item.type, item.layouts) };
}

export function toPageItem(item: GridItem): PageItemResponse {
  const { preset: _preset, ...pageItem } = item;
  return pageItem;
}

function normalizeLink(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function toBatchItem(item: GridItem): BatchItem {
  const { id, type, data, style, layouts } = item;
  switch (type) {
    case "text":
      return {
        id,
        type,
        data: { ...data, link: normalizeLink(data.link) },
        style,
        layouts,
      };
    case "media":
      return {
        id,
        type,
        data: {
          objectKey: data.objectKey,
          mimeType: data.mimeType,
          caption: data.caption,
          link: normalizeLink(data.link),
          crop: data.crop,
        },
        style,
        layouts,
      };
    case "map":
      return { id, type, data, style, layouts };
    case "section":
      return { id, type, data, style, layouts };
    case "link":
      return { id, type, data, style, layouts };
  }
}

function sameItem(left: BatchItem, right: BatchItem | undefined) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createItemBatch(
  items: readonly GridItem[],
  persisted: readonly GridItem[],
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

export function hasItemBatchChanges(batch: PageItemBatchRequest) {
  return batch.upserts.length > 0 || batch.deletes.length > 0;
}

export function mergeItems<T extends { id: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const currentIds = new Set(current.map((item) => item.id));
  return [
    ...current.map((item) => incomingById.get(item.id) ?? item),
    ...incoming.filter((item) => !currentIds.has(item.id)),
  ];
}

export function mergeAcknowledgedItems(
  draft: readonly GridItem[],
  acknowledged: readonly GridItem[],
  batch: PageItemBatchRequest,
): GridItem[] {
  const sentById = new Map(batch.upserts.map((item) => [item.id, item]));
  const acknowledgedById = new Map(acknowledged.map((item) => [item.id, item]));

  return draft.map((item) => {
    const sentItem = sentById.get(item.id);
    const acknowledgedItem = acknowledgedById.get(item.id);
    return sentItem && acknowledgedItem && sameItem(toBatchItem(item), sentItem)
      ? acknowledgedItem
      : item;
  });
}
