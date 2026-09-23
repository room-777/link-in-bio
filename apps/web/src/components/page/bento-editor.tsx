"use client";

import type { ItemType, PageByHandleResponse } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { toast } from "@grabbin/ui/components/toast";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useBentoStore } from "@/lib/bento/bento-store";
import AddWidgetDialog from "./add-widget-dialog";

const BentoSection = dynamic(() => import("./bento-section"), { ssr: false });

export default function BentoEditor({
	items,
	handle,
	breakpoint,
	entryAnimationRevision,
	entryReady,
	onEntryComplete,
	onGridSavingChange,
}: {
	items: PageByHandleResponse["items"];
	handle: string;
	breakpoint: BentoBreakpoint;
	entryAnimationRevision: number;
	entryReady: boolean;
	onEntryComplete?: () => void;
	onGridSavingChange?: (isSaving: boolean) => void;
}) {
	const store = useBentoStore({ initialItems: items, handle });
	useEffect(() => {
		onGridSavingChange?.(store.status === "dirty" || store.status === "saving");
	}, [onGridSavingChange, store.status]);

	const addItem = (itemType: ItemType, url?: string) => {
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
	};
	const editorClassName =
		breakpoint === "compact"
			? "relative flex w-full max-w-lg shrink-0 flex-col overflow-visible bg-background px-6 pb-0 no-scrollbar"
			: "relative flex min-w-0 flex-1 flex-col overflow-visible bg-background px-6 pt-12 pb-0 no-scrollbar min-[90rem]:w-4xl min-[90rem]:max-w-none min-[90rem]:flex-none min-[90rem]:pt-16";

	const selectMedia = async (file: File) => {
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
	};
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
				items={store.items}
				mode="edit"
				breakpoint={breakpoint}
				entryAnimationRevision={entryAnimationRevision}
				entryReady={entryReady}
				onEntryComplete={onEntryComplete}
				autoFocusItemId={store.autoFocusItemId}
				onAutoFocus={store.clearAutoFocusItem}
				onCommand={store.dispatchCommand}
				onRefreshLinkMetadata={store.refreshLinkMetadata}
				onLinkImageSelect={selectLinkImage}
			/>
			<AddWidgetDialog onItemAdd={addItem} onMediaSelect={selectMedia} />
		</section>
	);
}
