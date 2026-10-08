"use client";

import type { ItemType, PageByHandleResponse } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { toast } from "@grabbin/ui/components/toast";
import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { useBentoStore } from "@/lib/bento/bento-store";
import type { AddWidgetButtonProps } from "./add-widget-button";
import EditMobileShareLinkButton from "./edit-mobile-share-link-button";

const BentoSection = dynamic(() => import("./bento/bento-section"), {
	ssr: false,
});

export default function BentoEditor({
	items,
	handle,
	breakpoint,
	isAutoSaving,
	demoMode = false,
	profileImageUrl,
	entryAnimationRevision,
	entryReady,
	onReady,
	onGridSavingChange,
	onWidgetActionsChange,
}: {
	items: PageByHandleResponse["items"];
	handle: string;
	breakpoint: BentoBreakpoint;
	isAutoSaving: boolean;
	demoMode?: boolean;
	profileImageUrl: string | null;
	entryAnimationRevision: number;
	entryReady: boolean;
	onReady?: () => void;
	onGridSavingChange?: (isSaving: boolean) => void;
	onWidgetActionsChange?: (actions: AddWidgetButtonProps) => void;
}) {
	const store = useBentoStore({
		initialItems: items,
		handle,
		persistItems: !demoMode,
	});
	useEffect(() => {
		onGridSavingChange?.(store.status === "saving");
	}, [onGridSavingChange, store.status]);

	const addItem = useCallback(
		(itemType: Exclude<ItemType, "calendly">, url?: string) => {
			if (itemType === "link") {
				try {
					if (new URL(url?.trim() ?? "").protocol !== "https:") {
						throw new Error();
					}
				} catch {
					toast({ message: "Enter a valid HTTPS link.", state: "error" });
					return;
				}
			}
			const addedItem = store.dispatchCommand({
				type: "add-item",
				itemType,
				url,
			});
			if (itemType === "link" && addedItem?.type === "link") {
				void store.refreshLinkMetadata(addedItem.id).catch(() => {});
			}
		},
		[store.dispatchCommand, store.refreshLinkMetadata],
	);
	const addCalendlyItem = useCallback(
		(event: import("@grabbin/api").CalendlyEventType) => {
			store.dispatchCommand({ type: "add-calendly-item", event });
		},
		[store.dispatchCommand],
	);
	const editorClassName =
		breakpoint === "compact"
			? "relative flex w-full max-w-lg shrink-0 flex-col overflow-visible bg-transparent px-6 pb-0 no-scrollbar"
			: "relative flex min-w-0 flex-1 flex-col overflow-visible bg-background px-6 pt-12 pb-0 no-scrollbar page-wide:w-4xl page-wide:max-w-none page-wide:flex-none page-wide:pt-16";

	const selectMedia = useCallback(
		async (file: File) => {
			if (!/^(image|video)\//i.test(file.type)) {
				toast({ message: "Choose an image or video file.", state: "error" });
				return;
			}
			try {
				await store.addMediaUpload(file);
			} catch (error) {
				toast({
					message:
						error instanceof Error ? error.message : "The media upload failed.",
					state: "error",
				});
			}
		},
		[store.addMediaUpload],
	);
	useEffect(() => {
		onWidgetActionsChange?.({
			onItemAdd: addItem,
			onCalendlyAdd: addCalendlyItem,
			onMediaSelect: selectMedia,
		});
	}, [addCalendlyItem, addItem, onWidgetActionsChange, selectMedia]);
	const selectLinkImage = async (itemId: string, file: File) => {
		if (!/^image\//i.test(file.type)) {
			toast({ message: "Choose an image file.", state: "error" });
			return;
		}
		try {
			await store.replaceLinkImage(itemId, file);
		} catch (error) {
			toast({
				message:
					error instanceof Error ? error.message : "The image upload failed.",
				state: "error",
			});
		}
	};
	return (
		<section className={`bento-editor ${editorClassName}`}>
			<BentoSection
				handle={handle}
				items={store.items}
				mode="edit"
				breakpoint={breakpoint}
				entryAnimationRevision={entryAnimationRevision}
				entryReady={entryReady}
				onReady={onReady}
				autoFocusItemId={store.autoFocusItemId}
				onAutoFocus={store.clearAutoFocusItem}
				onCommand={store.dispatchCommand}
				onRefreshLinkMetadata={store.refreshLinkMetadata}
				onLinkImageSelect={selectLinkImage}
			/>
			<EditMobileShareLinkButton
				isAutoSaving={isAutoSaving}
				profileImageUrl={profileImageUrl}
			/>
		</section>
	);
}
