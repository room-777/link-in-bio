"use client";

import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import { Crop } from "lucide-react";
import { useOptionalMediaCrop } from "@/features/page/editor/contexts/media-crop-provider";
import type { BentoItem } from "@/features/page/editor/state/bento-types";

export default function MediaCropControl({ item }: { item: BentoItem }) {
	const mediaCrop = useOptionalMediaCrop();
	if (item.type !== "media" || !item.data.mediaUrl || !mediaCrop) return null;

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			aria-label={mediaCrop.isOpen ? "Apply media crop" : "Crop media"}
			title={mediaCrop.isOpen ? "Apply media crop" : "Crop media"}
			aria-pressed={mediaCrop.isOpen}
			disabled={mediaCrop.isOpen && !mediaCrop.canApply}
			className={cn(
				"cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white",
				mediaCrop.isOpen && "bg-brand-green! hover:bg-brand-green!",
			)}
			onClick={mediaCrop.isOpen ? mediaCrop.apply : mediaCrop.open}
		>
			<Crop className="size-5 stroke-2" />
		</Button>
	);
}
