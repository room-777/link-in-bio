"use client";

import type { PageImageCrop, UpdatePageDraft } from "@grabbin/api";
import { updatePageDraftSchema } from "@grabbin/api";
import { useCallback, useEffect, useRef, useState } from "react";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export const PAGE_AUTO_SAVE_DELAY = 1000;

export type PageAutoSaveStatus = "saved" | "dirty" | "saving" | "error";

type PageDraft = {
	name: string;
	bio: string;
	imageKey: string;
	imageCrop: PageImageCrop | null;
};

type PageSnapshot = {
	name: string | null;
	bio: string | null;
	imageKey: string | null;
	imageCrop: PageImageCrop | null;
};

function toDraft(page: PageSnapshot): PageDraft {
	return {
		name: page.name ?? "",
		bio: page.bio ?? "",
		imageKey: page.imageKey ?? "",
		imageCrop: page.imageCrop ?? null,
	};
}

function normalize(value: string | null | undefined) {
	return value?.trim() || null;
}

function getChangedFields(draft: PageDraft, saved: PageSnapshot) {
	const changes: UpdatePageDraft = { name: draft.name };
	let hasChanges = normalize(draft.name) !== normalize(saved.name);

	const bio = normalize(draft.bio);
	if (bio !== normalize(saved.bio)) {
		changes.bio = bio;
		hasChanges = true;
	}

	const imageKey = normalize(draft.imageKey);
	if (imageKey !== normalize(saved.imageKey)) {
		changes.imageKey = imageKey;
		hasChanges = true;
	}
	if (JSON.stringify(draft.imageCrop) !== JSON.stringify(saved.imageCrop)) {
		changes.imageCrop = draft.imageCrop;
		hasChanges = true;
	}

	return hasChanges ? changes : null;
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Could not save changes.";
}

export function usePageAutoSave({
	handle,
	page,
	enabled = true,
	onSaveFailure,
}: {
	handle: string;
	page: PageSnapshot;
	enabled?: boolean;
	onSaveFailure?: (
		changes: UpdatePageDraft,
		discardedImageKey: string | null,
		savedImageKey: string | null,
	) => void;
}) {
	const initialDraft = toDraft(page);
	const [draft, setDraft] = useState(initialDraft);
	const [status, setStatus] = useState<PageAutoSaveStatus>("saved");
	const [error, setError] = useState<string | null>(null);
	const draftRef = useRef(draft);
	const savedRef = useRef<PageSnapshot>(page);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestRef = useRef<Promise<boolean> | null>(null);
	const versionRef = useRef(0);
	const scheduleSaveRef = useRef<() => void>(() => {});
	const pageHandleRef = useRef(handle);

	useEffect(() => {
		if (pageHandleRef.current === handle) return;
		pageHandleRef.current = handle;
		if (timerRef.current) clearTimeout(timerRef.current);
		const nextDraft = toDraft(page);
		savedRef.current = page;
		draftRef.current = nextDraft;
		versionRef.current += 1;
		setDraft(nextDraft);
		setError(null);
		setStatus("saved");
	}, [handle, page]);

	const save = useCallback(async (): Promise<boolean> => {
		if (!enabled) return true;
		if (requestRef.current) return requestRef.current;

		const snapshot = draftRef.current;
		const changes = getChangedFields(snapshot, savedRef.current);
		if (!changes) {
			setStatus("saved");
			return true;
		}
		if (!snapshot.name.trim()) {
			setStatus("error");
			setError("Enter a valid name.");
			return false;
		}

		const sentVersion = versionRef.current;
		let succeeded = false;
		const request = (async () => {
			setStatus("saving");
			setError(null);
			try {
				const response = await apiClient.pages[":handle"].$patch(
					{ param: { handle } },
					{
						init: {
							body: JSON.stringify(v.parse(updatePageDraftSchema, changes)),
							headers: { "Content-Type": "application/json" },
						},
					},
				);
				if (!response.ok) throw new Error(await getApiErrorMessage(response));

				const body = await response.json();
				if (!("page" in body) || !body.page || typeof body.page !== "object") {
					throw new Error("Could not save changes.");
				}
				if (pageHandleRef.current !== handle) return true;

				savedRef.current = {
					name:
						"name" in body.page && typeof body.page.name === "string"
							? body.page.name
							: null,
					bio:
						"bio" in body.page && typeof body.page.bio === "string"
							? body.page.bio
							: null,
					imageKey:
						"imageKey" in body.page && typeof body.page.imageKey === "string"
							? body.page.imageKey
							: null,
					imageCrop:
						"imageCrop" in body.page && body.page.imageCrop
							? (body.page.imageCrop as PageImageCrop)
							: null,
				};
				if (sentVersion === versionRef.current) {
					const nextDraft = toDraft(savedRef.current);
					draftRef.current = nextDraft;
					setDraft(nextDraft);
				}
				succeeded = true;
				setError(null);
				setStatus(
					getChangedFields(draftRef.current, savedRef.current)
						? "dirty"
						: "saved",
				);
				return true;
			} catch (caught) {
				const discardedImageKey = normalize(draftRef.current.imageKey);
				const savedImageKey = normalize(savedRef.current.imageKey);
				const nextDraft = toDraft(savedRef.current);
				draftRef.current = nextDraft;
				setDraft(nextDraft);
				setStatus("error");
				setError(errorMessage(caught));
				onSaveFailure?.(changes, discardedImageKey, savedImageKey);
				return false;
			} finally {
				requestRef.current = null;
				if (succeeded && getChangedFields(draftRef.current, savedRef.current)) {
					scheduleSaveRef.current();
				}
			}
		})();
		requestRef.current = request;
		return request;
	}, [enabled, handle, onSaveFailure]);

	const scheduleSave = useCallback(() => {
		if (!enabled) return;
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			void save();
		}, PAGE_AUTO_SAVE_DELAY);
	}, [enabled, save]);

	useEffect(() => {
		scheduleSaveRef.current = scheduleSave;
	}, [scheduleSave]);

	const updateField = useCallback(
		(field: keyof PageDraft, value: PageDraft[typeof field]) => {
			const nextDraft = { ...draftRef.current, [field]: value };
			versionRef.current += 1;
			draftRef.current = nextDraft;
			setDraft(nextDraft);
			setError(null);
			if (!nextDraft.name.trim()) {
				setStatus("error");
				setError("Enter a valid name.");
				return;
			}
			setStatus(
				getChangedFields(nextDraft, savedRef.current) ? "dirty" : "saved",
			);
			if (getChangedFields(nextDraft, savedRef.current)) scheduleSave();
		},
		[scheduleSave],
	);

	const flush = useCallback(async () => {
		if (!enabled) return;
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		while (true) {
			const result = await save();
			if (!result) throw new Error("Could not save changes.");
			if (!getChangedFields(draftRef.current, savedRef.current)) return;
		}
	}, [enabled, save]);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return { draft, error, flush, status, updateField };
}
