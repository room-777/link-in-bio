"use client";

import type { ItemType, PageByHandleResponse } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { toast } from "@grabbin/ui/components/toast";
import { cn } from "@grabbin/ui/lib/utils";
import { Monitor, Smartphone } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
	const [breakpoint, setBreakpoint] = useState<BentoBreakpoint>("compact");
	const previewUrlsRef = useRef(new Set<string>());

	useEffect(() => {
		const activePreviewUrls = new Set(
			store.items.flatMap((item) =>
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
	}, [store.items]);

	useEffect(
		() => () => {
			for (const previewUrl of previewUrlsRef.current) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrlsRef.current.clear();
		},
		[],
	);

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
		previewUrlsRef.current.add(previewUrl);
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
			<div className="mb-4 flex min-h-5 items-center justify-between gap-3">
				<div
					className={cn(
						"text-muted-foreground/80 text-xs",
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
				<fieldset className="flex items-center gap-1 rounded-lg border p-1">
					<legend className="sr-only">Editing layout breakpoint</legend>
					<Button
						type="button"
						size="sm"
						variant={breakpoint === "compact" ? "secondary" : "ghost"}
						aria-pressed={breakpoint === "compact"}
						aria-label="Edit compact layout"
						onClick={() => setBreakpoint("compact")}
					>
						<Smartphone aria-hidden="true" />
						<span className="sr-only">Compact</span>
					</Button>
					<Button
						type="button"
						size="sm"
						variant={breakpoint === "wide" ? "secondary" : "ghost"}
						aria-pressed={breakpoint === "wide"}
						aria-label="Edit wide layout"
						onClick={() => setBreakpoint("wide")}
					>
						<Monitor aria-hidden="true" />
						<span className="sr-only">Wide</span>
					</Button>
				</fieldset>
			</div>
			<BentoSection
				items={store.items}
				mode="edit"
				breakpoint={breakpoint}
				autoFocusItemId={store.autoFocusItemId}
				onAutoFocus={store.clearAutoFocusItem}
				onCommand={store.dispatchCommand}
			/>
			<AddWidgetDialog onItemAdd={addItem} onMediaSelect={selectMedia} />
		</section>
	);
}
