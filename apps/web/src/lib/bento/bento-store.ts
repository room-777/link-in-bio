"use client";

import type { PageItemBatchRequest, PageItemResponse } from "@grabbin/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	cancelBentoMediaUpload,
	patchBentoBatch,
	refreshBentoLinkMetadata,
	uploadBentoMedia,
} from "./bento-api";
import {
	createBentoBatch,
	hasBentoBatchChanges,
	mergeAcknowledgedBentoItems,
	mergeBentoItems,
	toBentoItem,
} from "./bento-batch";
import { createBentoItem } from "./bento-factory";
import { reduceBentoItems } from "./bento-reducer";
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

type MediaUploadTask = {
	controller: AbortController;
	objectKey?: string;
	itemId?: string;
	kind?: "link-image";
};

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
	const previewUrlsRef = useRef(new Set<string>());
	const mediaUploadsRef = useRef(new Map<string, MediaUploadTask>());

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
			for (const task of mediaUploadsRef.current.values()) {
				task.controller.abort();
				if (task.objectKey) {
					void cancelBentoMediaUpload(handle, task.objectKey, task).catch(
						() => {},
					);
				}
			}
			for (const previewUrl of previewUrlsRef.current) {
				URL.revokeObjectURL(previewUrl);
			}
			mediaUploadsRef.current.clear();
			previewUrlsRef.current.clear();
		},
		[handle],
	);

	useEffect(() => {
		const activePreviewUrls = new Set(
			items.flatMap((item) =>
				item.type === "media" && item.data.mediaUrl?.startsWith("blob:")
					? [item.data.mediaUrl]
					: [],
			),
		);
		for (const previewUrl of previewUrlsRef.current) {
			if (activePreviewUrls.has(previewUrl)) continue;
			URL.revokeObjectURL(previewUrl);
			previewUrlsRef.current.delete(previewUrl);
		}
	}, [items]);

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
				if (stateVersion !== stateVersionRef.current) {
					shouldScheduleFollowUp = hasBentoBatchChanges(pendingRef.current);
					return { ok: true };
				}

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
				if (stateVersion !== stateVersionRef.current) {
					shouldScheduleFollowUp = hasBentoBatchChanges(pendingRef.current);
					return { ok: true };
				}
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
			if (command.type === "delete-item") {
				const task = mediaUploadsRef.current.get(command.itemId);
				if (task) {
					task.controller.abort();
					mediaUploadsRef.current.delete(command.itemId);
					if (task.objectKey) {
						void cancelBentoMediaUpload(handle, task.objectKey, task).catch(
							() => {},
						);
					}
				}
			}
			const currentItems = draftRef.current;
			const result = reduceBentoItems(currentItems, command);
			if (!result) return undefined;
			if (command.type === "delete-item") {
				deletedIdsRef.current.add(command.itemId);
			}

			if (command.type === "add-item" && result.addedItem) {
				setAutoFocusItemId(
					command.itemType === "text" || command.itemType === "section"
						? result.addedItem.id
						: null,
				);
				commitItems(result.items);
				return result.addedItem;
			}

			commitItems(result.items);
			return undefined;
		},
		[commitItems, enabled, handle],
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

	const addMediaUpload = useCallback(
		async (file: File) => {
			if (!enabled) return;
			const previewUrl = URL.createObjectURL(file);
			const itemId = addPendingMedia({
				mimeType: file.type,
				previewUrl,
			});
			if (!itemId) {
				URL.revokeObjectURL(previewUrl);
				return;
			}
			previewUrlsRef.current.add(previewUrl);
			const task: MediaUploadTask = {
				controller: new AbortController(),
			};
			mediaUploadsRef.current.set(itemId, task);

			try {
				const upload = await uploadBentoMedia(handle, file, {
					signal: task.controller.signal,
					onUploadCreated: (createdUpload) => {
						task.objectKey = createdUpload.objectKey;
					},
				});
				if (task.controller.signal.aborted) return;
				if (mediaUploadsRef.current.get(itemId) !== task) return;
				mediaUploadsRef.current.delete(itemId);
				updateMediaUpload({
					itemId,
					objectKey: upload.objectKey,
					mimeType: upload.mimeType,
				});
			} catch (error) {
				if (mediaUploadsRef.current.get(itemId) === task) {
					mediaUploadsRef.current.delete(itemId);
					if (task.objectKey) {
						void cancelBentoMediaUpload(handle, task.objectKey, task).catch(
							() => {},
						);
					}
					if (draftRef.current.some((item) => item.id === itemId)) {
						commitItems(draftRef.current.filter((item) => item.id !== itemId));
					}
				}
				if (task.controller.signal.aborted) return;
				throw error;
			}
		},
		[addPendingMedia, commitItems, enabled, handle, updateMediaUpload],
	);

	const replaceLinkImage = useCallback(
		async (itemId: string, file: File) => {
			if (!enabled || !/^image\//i.test(file.type)) return;
			const item = draftRef.current.find(
				(candidate) => candidate.id === itemId,
			);
			if (item?.type !== "link") return;

			const previousTask = mediaUploadsRef.current.get(itemId);
			if (previousTask) {
				previousTask.controller.abort();
				mediaUploadsRef.current.delete(itemId);
				if (previousTask.objectKey) {
					void cancelBentoMediaUpload(
						handle,
						previousTask.objectKey,
						previousTask,
					).catch(() => {});
				}
			}

			const task: MediaUploadTask = {
				controller: new AbortController(),
				itemId,
				kind: "link-image",
			};
			mediaUploadsRef.current.set(itemId, task);
			try {
				const upload = await uploadBentoMedia(handle, file, {
					signal: task.controller.signal,
					itemId,
					kind: "link-image",
					onUploadCreated: (createdUpload) => {
						task.objectKey = createdUpload.objectKey;
					},
				});
				if (task.controller.signal.aborted) return;
				if (mediaUploadsRef.current.get(itemId) !== task) return;
				mediaUploadsRef.current.delete(itemId);
				const nextItems = draftRef.current.map((current) =>
					current.id === itemId && current.type === "link"
						? {
								...current,
								data: { ...current.data, imageKey: upload.objectKey },
							}
						: current,
				);
				commitItems(nextItems);
			} catch (error) {
				if (mediaUploadsRef.current.get(itemId) === task) {
					mediaUploadsRef.current.delete(itemId);
					if (task.objectKey) {
						void cancelBentoMediaUpload(handle, task.objectKey, task).catch(
							() => {},
						);
					}
				}
				if (task.controller.signal.aborted) return;
				throw error;
			}
		},
		[commitItems, enabled, handle],
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

	const refreshLinkMetadata = useCallback(
		async (itemId: string) => {
			await flushPendingChanges();
			const requestedItem = draftRef.current.find((item) => item.id === itemId);
			if (requestedItem?.type !== "link") return;
			const requestedUrl = requestedItem.data.url;

			try {
				const response = await refreshBentoLinkMetadata(handle, {
					itemId,
					url: requestedUrl,
				});
				const currentItem = draftRef.current.find((item) => item.id === itemId);
				if (
					currentItem?.type !== "link" ||
					currentItem.data.url !== requestedUrl
				) {
					return;
				}

				const refreshedItem = toBentoItem(response.item);
				if (refreshedItem.type !== "link") return;
				const nextItem: BentoItem = {
					...currentItem,
					updatedAt: refreshedItem.updatedAt,
					data: {
						...currentItem.data,
						metadata: refreshedItem.data.metadata,
					},
				};
				const nextDraft = draftRef.current.map((item) =>
					item.id === itemId ? nextItem : item,
				);
				draftRef.current = nextDraft;
				persistedRef.current = mergeBentoItems(persistedRef.current, [
					refreshedItem,
				]);
				pendingRef.current = createBentoBatch(
					nextDraft,
					persistedRef.current,
					deletedIdsRef.current,
				);
				setItems(nextDraft);
				setStatus(hasBentoBatchChanges(pendingRef.current) ? "dirty" : "saved");
				setErrorMessage(null);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Unable to refresh link metadata.";
				setErrorMessage(message);
				setStatus("error");
				throw error;
			}
		},
		[flushPendingChanges, handle],
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
		addMediaUpload,
		replaceLinkImage,
		refreshLinkMetadata,
		flushPendingChanges,
	};
}
