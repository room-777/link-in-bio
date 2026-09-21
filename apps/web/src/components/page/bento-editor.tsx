"use client";

import type { ItemType, PageByHandleResponse } from "@grabbin/api";
import { toast } from "@grabbin/ui/components/toast";
import { cn } from "@grabbin/ui/lib/utils";
import dynamic from "next/dynamic";
import { uploadBentoMedia } from "@/lib/bento/bento-api";
import { useBentoStore } from "@/lib/bento/bento-store";
import AddWidgetDialog from "./add-widget-dialog";

const BentoSection = dynamic(() => import("./bento-section"), { ssr: false });

export default function BentoEditor({
	items,
	handle,
}: {
	items: PageByHandleResponse["items"];
	handle: string;
}) {
	const store = useBentoStore({ initialItems: items, handle });

	const addItem = (itemType: ItemType, url?: string) => {
		store.dispatchCommand({ type: "add-item", itemType, url });
	};

	const selectMedia = async (file: File) => {
		if (!/^(image|video)\//i.test(file.type)) {
			toast({ message: "Choose an image or video file.", state: "error" });
			return;
		}
		const previewUrl = URL.createObjectURL(file);
		const itemId = store.addPendingMedia({
			mimeType: file.type,
			previewUrl,
		});
		if (!itemId) {
			URL.revokeObjectURL(previewUrl);
			return;
		}
		try {
			const upload = await uploadBentoMedia(handle, file);
			store.updateMediaUpload({
				itemId,
				objectKey: upload.objectKey,
				mimeType: upload.mimeType,
			});
		} catch (error) {
			store.dispatchCommand({ type: "delete-item", itemId });
			toast({
				message:
					error instanceof Error ? error.message : "The media upload failed.",
				state: "error",
			});
		}
	};

	return (
		<section className="relative flex min-h-dvh min-w-0 flex-1 flex-col items-center overflow-y-auto bg-background px-6 pt-12 pb-32 min-[90rem]:pt-16">
			<div
				className={cn(
					"mb-4 min-h-5 text-muted-foreground/80 text-xs",
					store.status === "error" && "text-destructive",
				)}
				role="status"
				aria-live="polite"
			>
				{store.status === "saving"
					? "Saving..."
					: store.status === "error"
						? (store.errorMessage ?? "Unable to save.")
						: null}
			</div>
			<BentoSection
				items={store.items}
				mode="edit"
				autoFocusItemId={store.autoFocusItemId}
				onAutoFocus={store.clearAutoFocusItem}
				onCommand={store.dispatchCommand}
			/>
			<AddWidgetDialog onItemAdd={addItem} onMediaSelect={selectMedia} />
		</section>
	);
}
