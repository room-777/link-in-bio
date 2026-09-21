"use client";

import type { PageItemBatchRequest, PageItemResponse } from "@grabbin/api";
import {
	getAllowedPresets,
	getColumns,
	getPresetGeometry,
	placeAtFirstAvailable,
	validateBentoLayout,
} from "@grabbin/bento-layout";
import { useCallback, useEffect, useRef, useState } from "react";
import { patchBentoBatch } from "./bento-api";
import {
	createBentoBatch,
	hasBentoBatchChanges,
	mergeAcknowledgedBentoItems,
	mergeBentoItems,
	toBentoItem,
} from "./bento-batch";
import { createBentoItem } from "./bento-factory";
import type { BentoCommand, BentoItem } from "./bento-types";

export type BentoStoreStatus = "saved" | "dirty" | "saving" | "error";

type SaveResult = { ok: true } | { ok: false; error: Error };

type UseBentoStoreOptions = {
	initialItems: readonly PageItemResponse[];
	handle: string;
	enabled?: boolean;
	persistItems?: boolean;
};

const SAVE_DELAY = 700;

export function useBentoStore({
	initialItems,
	handle,
	enabled = true,
	persistItems = true,
}: UseBentoStoreOptions) {
	const [items, setItems] = useState<BentoItem[]>(() =>
		initialItems.map(toBentoItem),
	);
	const [status, setStatus] = useState<BentoStoreStatus>("saved");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [autoFocusItemId, setAutoFocusItemId] = useState<string | null>(null);
	const draftRef = useRef(items);
	const persistedRef = useRef(items);
	const pendingRef = useRef<PageItemBatchRequest>({ upserts: [], deletes: [] });
	const deletedIdsRef = useRef<Set<string>>(new Set());
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const saveInFlightRef = useRef<Promise<SaveResult> | null>(null);
	const scheduleSaveRef = useRef<() => void>(() => {});
	const stateVersionRef = useRef(0);

	useEffect(() => {
		const nextItems = initialItems.map(toBentoItem);
		stateVersionRef.current += 1;
		draftRef.current = nextItems;
		persistedRef.current = nextItems;
		pendingRef.current = { upserts: [], deletes: [] };
		deletedIdsRef.current = new Set();
		setItems(nextItems);
		setAutoFocusItemId(null);
		setStatus("saved");
		setErrorMessage(null);
	}, [initialItems]);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	const savePendingChanges = useCallback(() => {
		if (!persistItems) {
			pendingRef.current = { upserts: [], deletes: [] };
			return Promise.resolve<SaveResult>({ ok: true });
		}
		if (saveInFlightRef.current) return saveInFlightRef.current;

		const sentBatch = pendingRef.current;
		pendingRef.current = { upserts: [], deletes: [] };
		if (!hasBentoBatchChanges(sentBatch)) {
			return Promise.resolve<SaveResult>({ ok: true });
		}

		const stateVersion = stateVersionRef.current;
		setStatus("saving");
		setErrorMessage(null);

		let request: Promise<SaveResult> | null = null;
		request = (async () => {
			let shouldScheduleFollowUp = false;
			try {
				const response = await patchBentoBatch(handle, sentBatch);
				if (stateVersion !== stateVersionRef.current) return { ok: true };

				const sentIds = new Set(sentBatch.upserts.map((item) => item.id));
				const acknowledgedItems = response.items
					.map(toBentoItem)
					.filter((item) => sentIds.has(item.id));
				persistedRef.current = mergeBentoItems(
					persistedRef.current,
					acknowledgedItems,
				);
				persistedRef.current = persistedRef.current.filter(
					(item) => !sentBatch.deletes.includes(item.id),
				);
				for (const id of sentBatch.deletes) deletedIdsRef.current.delete(id);

				const nextDraft = mergeAcknowledgedBentoItems(
					draftRef.current,
					acknowledgedItems,
					sentBatch,
				);
				draftRef.current = nextDraft;
				setItems(nextDraft);
				const nextBatch = createBentoBatch(
					nextDraft,
					persistedRef.current,
					deletedIdsRef.current,
				);
				pendingRef.current = nextBatch;
				shouldScheduleFollowUp = hasBentoBatchChanges(nextBatch);
				setStatus(shouldScheduleFollowUp ? "dirty" : "saved");
				return { ok: true };
			} catch (error) {
				if (stateVersion !== stateVersionRef.current) return { ok: true };
				const nextBatch = createBentoBatch(
					draftRef.current,
					persistedRef.current,
					deletedIdsRef.current,
				);
				pendingRef.current = nextBatch;
				const saveError =
					error instanceof Error
						? error
						: new Error("Unable to save bento items.");
				setErrorMessage(saveError.message);
				setStatus("error");
				shouldScheduleFollowUp = false;
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
	}, [handle, persistItems]);

	const scheduleSave = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			void savePendingChanges();
		}, SAVE_DELAY);
	}, [savePendingChanges]);

	useEffect(() => {
		scheduleSaveRef.current = scheduleSave;
	}, [scheduleSave]);

	const commitItems = useCallback(
		(nextItems: BentoItem[]) => {
			if (
				draftRef.current.length === nextItems.length &&
				draftRef.current.every((item, index) => item === nextItems[index])
			) {
				return;
			}
			stateVersionRef.current += 1;
			draftRef.current = nextItems;
			setItems(nextItems);
			if (!persistItems) {
				setStatus("saved");
				setErrorMessage(null);
				return;
			}
			const nextBatch = createBentoBatch(
				nextItems,
				persistedRef.current,
				deletedIdsRef.current,
			);
			pendingRef.current = nextBatch;
			const hasChanges = hasBentoBatchChanges(nextBatch);
			setStatus(hasChanges ? "dirty" : "saved");
			setErrorMessage(null);
			if (hasChanges) scheduleSave();
		},
		[persistItems, scheduleSave],
	);

	const dispatchCommand = useCallback(
		(command: BentoCommand) => {
			if (!enabled) return undefined;
			const currentItems = draftRef.current;
			if (command.type === "add-item") {
				const newItem = createBentoItem({
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
				if (
					!validateBentoLayout(command.layout, getColumns(command.breakpoint))
				) {
					return undefined;
				}
				commitItems(
					currentItems.map((item) => {
						const layout = command.layout[item.id];
						return layout
							? {
									...item,
									layouts: { ...item.layouts, [command.breakpoint]: layout },
								}
							: item;
					}),
				);
				return undefined;
			}

			if (command.type === "apply-preset") {
				const target = currentItems.find((item) => item.id === command.itemId);
				if (
					!target ||
					!getAllowedPresets(target.type).includes(command.preset)
				) {
					return undefined;
				}
				const columns = getColumns(command.breakpoint);
				const otherLayouts = Object.fromEntries(
					currentItems
						.filter((item) => item.id !== target.id)
						.map((item) => [item.id, item.layouts[command.breakpoint]]),
				);
				const geometry = getPresetGeometry(command.preset, command.breakpoint);
				const currentLayout = target.layouts[command.breakpoint];
				const positionedLayout = {
					...geometry,
					x: currentLayout.x,
					y: currentLayout.y,
				};
				const nextLayout = validateBentoLayout(
					{ ...otherLayouts, [target.id]: positionedLayout },
					columns,
				)
					? positionedLayout
					: placeAtFirstAvailable(otherLayouts, geometry, columns);
				commitItems(
					currentItems.map((item) =>
						item.id === target.id
							? {
									...item,
									preset: command.preset,
									layouts: {
										...item.layouts,
										[command.breakpoint]: nextLayout,
									},
								}
							: item,
					),
				);
				return undefined;
			}

			const target = currentItems.find((item) => item.id === command.itemId);
			if (!target) return undefined;
			if (command.type === "update-data") {
				commitItems(
					currentItems.map((item) =>
						item.id === command.itemId
							? ({
									...item,
									data: structuredClone(command.data) as typeof item.data,
								} as BentoItem)
							: item,
					),
				);
				return undefined;
			}
			if (command.type === "update-style") {
				commitItems(
					currentItems.map((item) =>
						item.id === command.itemId
							? { ...item, style: { ...item.style, ...command.patch } }
							: item,
					),
				);
				return undefined;
			}

			deletedIdsRef.current.add(command.itemId);
			commitItems(currentItems.filter((item) => item.id !== command.itemId));
			return undefined;
		},
		[commitItems, enabled],
	);

	const addPendingMedia = useCallback(
		({ mimeType, previewUrl }: { mimeType: string; previewUrl: string }) => {
			if (!enabled) return null;
			const item = createBentoItem({
				items: draftRef.current,
				itemType: "media",
				media: { mimeType, previewUrl },
			});
			commitItems([...draftRef.current, item]);
			return item.id;
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
			const nextItems = draftRef.current.map((item) =>
				item.id === itemId && item.type === "media"
					? { ...item, data: { ...item.data, objectKey, mimeType } }
					: item,
			);
			commitItems(nextItems);
		},
		[commitItems],
	);

	const flushPendingChanges = useCallback(async () => {
		while (
			saveInFlightRef.current ||
			hasBentoBatchChanges(pendingRef.current)
		) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			const result = await savePendingChanges();
			if (!result.ok) throw result.error;
		}
		return draftRef.current;
	}, [savePendingChanges]);

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
		addPendingMedia,
		updateMediaUpload,
		flushPendingChanges,
	};
}
