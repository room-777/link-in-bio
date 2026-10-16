"use client";

import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import { Crop } from "lucide-react";
import type { BentoItem } from "@/features/page/bento-item";
import type { MediaCrop } from "../../../hooks/use-media-crop";

export default function MediaCropControl({
	item,
	crop,
}: {
	item: BentoItem;
	crop: MediaCrop;
}) {
	if (item.type !== "media" || !item.data.mediaUrl) return null;
	const { isOpen, canApply, apply, open } = crop;

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			aria-label={isOpen ? "Apply media crop" : "Crop media"}
			title={isOpen ? "Apply media crop" : "Crop media"}
			aria-pressed={isOpen}
			disabled={isOpen && !canApply}
			className={cn(
				"cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white",
				isOpen && "bg-brand-green! hover:bg-brand-green!",
			)}
			onClick={isOpen ? apply : open}
		>
			<Crop className="size-5 stroke-2" />
		</Button>
	);
}
