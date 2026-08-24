import type {
  PageByHandleResponse,
  PageItemBatchRequest,
  PageItemResponse,
} from "@grabbin/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { pageQueryKey, patchPageItemsBatch } from "@/lib/client/page-api";
import { AUTO_SAVE_DELAY } from "@/lib/page/use-page-auto-save";
import {
  createItemBatch,
  hasItemBatchChanges,
  mergeAcknowledgedItems,
  mergeItems,
  toGridItem,
  toPageItem,
} from "./item-batch";
import { createGridItem } from "./item-factory";
import {
  applyPresetToLayoutMap,
  getAllowedPresets,
  getColumns,
  mergeLayoutMapIntoItems,
  resolveAxisAwareSwap,
  toLayoutMap,
  validateLayout,
} from "./layout-engine";
import type { Breakpoint, GridEditorCommand, GridItem } from "./types";

export type GridEditorStatus = "saved" | "dirty" | "saving" | "error";

type SavePendingChangesResult = { ok: true } | { ok: false; error: Error };

type UseGridEditorStoreOptions = {
  initialItems: readonly PageItemResponse[];
  handle: string;
  breakpoint: Breakpoint;
  enabled?: boolean;
  persistItems?: boolean;
};

export function useGridEditorStore({
  initialItems,
  handle,
  breakpoint,
  enabled = true,
  persistItems = true,
}: UseGridEditorStoreOptions) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<GridItem[]>(() =>
    initialItems.map(toGridItem),
  );
  const [status, setStatus] = useState<GridEditorStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoFocusItemId, setAutoFocusItemId] = useState<string | null>(null);
  const draftRef = useRef(items);
  const persistedRef = useRef(items);
  const pendingRef = useRef<PageItemBatchRequest>({ upserts: [], deletes: [] });
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftVersionRef = useRef(0);
  const stateVersionRef = useRef(0);
  const saveInFlightRef = useRef<Promise<SavePendingChangesResult> | null>(
    null,
  );
  const scheduleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const nextItems = initialItems.map(toGridItem);
    stateVersionRef.current += 1;
    draftVersionRef.current += 1;
    draftRef.current = nextItems;
    persistedRef.current = nextItems;
    pendingRef.current = { upserts: [], deletes: [] };
    deletedIdsRef.current = new Set();
    setItems(nextItems);
    setAutoFocusItemId(null);
    setStatus("saved");
    setErrorMessage(null);
  }, [initialItems]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const syncQueryCache = useCallback(
    (nextItems: readonly GridItem[]) => {
      const queryKey = pageQueryKey(handle);
      queryClient.setQueryData(
        queryKey,
        (current: PageByHandleResponse | null | undefined) => {
          if (!current) return current;
          return {
            ...current,
            items: nextItems.map(toPageItem),
          };
        },
      );
    },
    [handle, queryClient],
  );

  const savePendingChanges = useCallback(() => {
    if (!persistItems) {
      pendingRef.current = { upserts: [], deletes: [] };
      return Promise.resolve<SavePendingChangesResult>({ ok: true });
    }

    if (saveInFlightRef.current) return saveInFlightRef.current;

    const sentBatch = pendingRef.current;
    pendingRef.current = { upserts: [], deletes: [] };
    if (!hasItemBatchChanges(sentBatch)) {
      return Promise.resolve<SavePendingChangesResult>({ ok: true });
    }

    const stateVersion = stateVersionRef.current;
    const draftVersion = draftVersionRef.current;

    setStatus("saving");
    setErrorMessage(null);

    let request: Promise<SavePendingChangesResult> | null = null;
    request = (async (): Promise<SavePendingChangesResult> => {
      let shouldScheduleFollowUp = false;

      try {
        const response = await patchPageItemsBatch(handle, sentBatch);
        if (stateVersion !== stateVersionRef.current) return { ok: true };

        const sentIds = new Set(sentBatch.upserts.map((item) => item.id));
        const acknowledgedItems = response.items
          .map(toGridItem)
          .filter((item) => sentIds.has(item.id));
        persistedRef.current = mergeItems(
          persistedRef.current,
          acknowledgedItems,
        );
        persistedRef.current = persistedRef.current.filter(
          (item) => !sentBatch.deletes.includes(item.id),
        );
        for (const id of sentBatch.deletes) deletedIdsRef.current.delete(id);
        const nextDraft = mergeAcknowledgedItems(
          draftRef.current,
          acknowledgedItems,
          sentBatch,
        );
        draftRef.current = nextDraft;
        setItems(nextDraft);
        syncQueryCache(nextDraft);

        const nextBatch = createItemBatch(
          nextDraft,
          persistedRef.current,
          deletedIdsRef.current,
        );
        pendingRef.current = nextBatch;
        setStatus(hasItemBatchChanges(nextBatch) ? "dirty" : "saved");
        shouldScheduleFollowUp = hasItemBatchChanges(nextBatch);
        return { ok: true };
      } catch (error) {
        if (stateVersion !== stateVersionRef.current) return { ok: true };

        const nextBatch = createItemBatch(
          draftRef.current,
          persistedRef.current,
          deletedIdsRef.current,
        );
        pendingRef.current = nextBatch;
        const hasNewerDraft = draftVersion !== draftVersionRef.current;
        const saveError =
          error instanceof Error
            ? error
            : new Error("Unknown grid update error");
        setErrorMessage(saveError.message);
        setStatus("error");
        shouldScheduleFollowUp =
          hasNewerDraft && hasItemBatchChanges(nextBatch);
        return { ok: false, error: saveError };
      } finally {
        if (request && saveInFlightRef.current === request) {
          saveInFlightRef.current = null;
        }
        if (shouldScheduleFollowUp) scheduleSaveRef.current();
      }
    })();

    saveInFlightRef.current = request;
    return request;
  }, [handle, persistItems, syncQueryCache]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void savePendingChanges();
    }, AUTO_SAVE_DELAY);
  }, [savePendingChanges]);

  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  const commitItems = useCallback(
    (nextItems: GridItem[]) => {
      if (
        draftRef.current.length === nextItems.length &&
        draftRef.current.every((item, index) => item === nextItems[index])
      ) {
        return;
      }
      draftVersionRef.current += 1;
      draftRef.current = nextItems;
      setItems(nextItems);
      syncQueryCache(nextItems);
      if (!persistItems) {
        setStatus("saved");
        setErrorMessage(null);
        return;
      }
      const nextBatch = createItemBatch(
        nextItems,
        persistedRef.current,
        deletedIdsRef.current,
      );
      pendingRef.current = nextBatch;
      const hasChanges = persistItems && hasItemBatchChanges(nextBatch);
      setStatus(hasChanges ? "dirty" : "saved");
      setErrorMessage(null);
      if (hasChanges) scheduleSave();
    },
    [persistItems, scheduleSave, syncQueryCache],
  );

  const dispatchCommand = useCallback(
    (command: GridEditorCommand) => {
      if (!enabled) return undefined;

      const currentItems = draftRef.current;
      if (command.type === "add-item") {
        const newItem = createGridItem({
          items: currentItems,
          itemType: command.itemType,
          url: command.url,
        });
        setAutoFocusItemId(
          command.itemType === "text" || command.itemType === "section"
            ? newItem.id
            : null,
        );
        commitItems([...currentItems, newItem]);
        return newItem;
      }
      if (command.type === "replace-layout") {
        try {
          validateLayout(command.layout, getColumns(command.breakpoint));
        } catch {
          return undefined;
        }
        commitItems(
          mergeLayoutMapIntoItems(
            currentItems,
            command.breakpoint,
            command.layout,
          ),
        );
        return undefined;
      }
      const targetItem = currentItems.find(
        (item) => item.id === command.itemId,
      );
      if (!targetItem) return undefined;

      if (command.type === "update-data") {
        commitItems(
          currentItems.map((item) =>
            item.id === command.itemId
              ? ({
                  ...item,
                  data: structuredClone(command.data) as typeof item.data,
                } as GridItem)
              : item,
          ),
        );
        return undefined;
      }

      if (command.type === "update-style") {
        commitItems(
          currentItems.map((item) =>
            item.id === command.itemId
              ? {
                  ...item,
                  style: { ...item.style, ...structuredClone(command.patch) },
                }
              : item,
          ),
        );
        return undefined;
      }

      if (command.type === "delete-item") {
        deletedIdsRef.current.add(command.itemId);
        commitItems(currentItems.filter((item) => item.id !== command.itemId));
        return undefined;
      }

      if (command.type === "move-item") {
        const nextLayoutMap = resolveAxisAwareSwap(
          toLayoutMap(currentItems, breakpoint),
          command.itemId,
          command.layout,
          command.dragDelta,
          getColumns(breakpoint),
        );
        commitItems(
          mergeLayoutMapIntoItems(currentItems, breakpoint, nextLayoutMap),
        );
        return undefined;
      }

      if (!getAllowedPresets(targetItem.type).includes(command.preset)) {
        return undefined;
      }

      const nextLayoutMap = applyPresetToLayoutMap({
        layouts: toLayoutMap(currentItems, command.breakpoint ?? breakpoint),
        itemId: command.itemId,
        itemType: targetItem.type,
        preset: command.preset,
        breakpoint: command.breakpoint ?? breakpoint,
      });

      commitItems(
        mergeLayoutMapIntoItems(
          currentItems,
          command.breakpoint ?? breakpoint,
          nextLayoutMap,
        ).map((item) =>
          item.id === command.itemId
            ? {
                ...item,
                preset: command.preset,
              }
            : item,
        ),
      );
    },
    [breakpoint, commitItems, enabled],
  );

  const addPendingMedia = useCallback(
    ({ mimeType, previewUrl }: { mimeType: string; previewUrl: string }) => {
      if (!enabled) return null;
      const currentItems = draftRef.current;
      const newItem = createGridItem({
        items: currentItems,
        itemType: "media",
        media: { mimeType, previewUrl },
      });
      commitItems([...currentItems, newItem]);
      return newItem.id;
    },
    [commitItems, enabled],
  );

  const updateMediaUpload = useCallback(
    ({
      itemId,
      objectKey,
      mimeType,
    }: {
      itemId: string;
      objectKey: string;
      mimeType: string;
    }) => {
      const currentItems = draftRef.current;
      const item = currentItems.find(
        (candidate) => candidate.id === itemId && candidate.type === "media",
      );
      if (!item || item.type !== "media") return;
      commitItems(
        currentItems.map((candidate) =>
          candidate.id === itemId && candidate.type === "media"
            ? {
                ...candidate,
                data: {
                  ...candidate.data,
                  objectKey,
                  mimeType,
                },
              }
            : candidate,
        ),
      );
    },
    [commitItems],
  );

  const removeMediaItem = useCallback(
    (itemId: string) => {
      const currentItems = draftRef.current;
      if (!currentItems.some((item) => item.id === itemId)) return;
      deletedIdsRef.current.add(itemId);
      commitItems(currentItems.filter((item) => item.id !== itemId));
    },
    [commitItems],
  );

  const flushPendingChanges = useCallback(async () => {
    while (saveInFlightRef.current || hasItemBatchChanges(pendingRef.current)) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const result = await savePendingChanges();
      if (!result.ok) throw result.error;
    }
    return draftRef.current;
  }, [savePendingChanges]);

  const replaceItemFromServer = useCallback(
    (incoming: PageItemResponse) => {
      const currentItems = draftRef.current;
      const current = currentItems.find((item) => item.id === incoming.id);
      if (!current) return;
      const nextItem = {
        ...current,
        ...toGridItem(incoming),
        style: current.style,
        layouts: current.layouts,
      };
      const nextItems = currentItems.map((item) =>
        item.id === incoming.id ? nextItem : item,
      );
      draftRef.current = nextItems;
      persistedRef.current = mergeItems(persistedRef.current, [nextItem]);
      pendingRef.current = createItemBatch(
        nextItems,
        persistedRef.current,
        deletedIdsRef.current,
      );
      setItems(nextItems);
      syncQueryCache(nextItems);
    },
    [syncQueryCache],
  );

  const clearAutoFocusItem = useCallback((itemId: string) => {
    setAutoFocusItemId((current) => (current === itemId ? null : current));
  }, []);

  return {
    items,
    autoFocusItemId,
    clearAutoFocusItem,
    status,
    errorMessage,
    dispatchCommand,
    flushPendingChanges,
    replaceItemFromServer,
    addPendingMedia,
    updateMediaUpload,
    removeMediaItem,
  };
}
