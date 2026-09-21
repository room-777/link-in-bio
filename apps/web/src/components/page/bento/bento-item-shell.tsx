"use client";

import { inferPresetFromLayout } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { Trash2 } from "lucide-react";
import { type CSSProperties, useRef } from "react";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import BentoItemControls from "../bento-item-controls";
import { RuntimeFallback, renderItem } from "./bento-item-registry";
import { MediaCropProvider } from "./items/media-crop-context";

function getBackgroundColor(value: string | undefined) {
	if (!value) return undefined;
	if (value.startsWith("#")) return value;
	if (value === "bg-transparent") return "transparent";
	if (value === "bg-current") return "currentColor";
	if (value === "bg-inherit") return "inherit";

	const token = value.slice(3);
	const [name, opacity] = token.split("/");
	const semanticTokens = new Set([
		"accent",
		"background",
		"destructive",
		"foreground",
		"input",
		"muted",
		"primary",
		"ring",
		"secondary",
	]);
	const cssVariable = semanticTokens.has(name)
		? `--${name}`
		: `--color-${name}`;

	return opacity
		? `color-mix(in oklch, var(${cssVariable}) ${opacity}%, transparent)`
		: `var(${cssVariable})`;
}

export function BentoItemShell({
	item,
	breakpoint,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
	isUploading = false,
	onCancelUpload,
	onRefreshLinkMetadata,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	isUploading?: boolean;
	onCancelUpload?: () => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
}) {
	const preset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);
	const linkPresentation =
		item.type === "link" ? item.data.metadata?.presentation : undefined;
	const linkTheme = linkPresentation?.cardBackground
		? linkPresentation
		: undefined;
	const cardStyle: CSSProperties = {
		backgroundColor:
			getBackgroundColor(item.style.backgroundColor) ??
			linkTheme?.cardBackground,
	};
	const content = (
		<>
			<div
				data-bento-item-card="true"
				className={`bento-item-card smooth-shadow-ring-sm relative size-full overflow-hidden rounded-2xl bg-background ${item.type === "map" ? "map-item-interaction" : ""} ${linkTheme ? "link-card-themed" : ""}`}
				style={cardStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{preset ? (
						renderItem(item, preset, {
							mode,
							autoFocus,
							onAutoFocus,
							onCommand,
							isUploading,
							onCancelUpload,
						})
					) : (
						<RuntimeFallback item={item} />
					)}
				</div>
			</div>
			{mode === "edit" && onCommand ? (
				<>
					<Button
						type="button"
						variant="default"
						size="icon-sm"
						aria-label="Delete item"
						title="Delete item"
						data-bento-item-delete-control="true"
						onClick={() => onCommand({ type: "delete-item", itemId: item.id })}
						className="absolute -top-4 -right-4 z-20 size-10 rounded-lg p-1 opacity-0 shadow-xs transition-[opacity,transform,scale] duration-150 focus-visible:scale-100 focus-visible:opacity-100 group-hover/bento-item:scale-100 group-hover/bento-item:opacity-100 motion-reduce:transition-none"
					>
						<Trash2 className="size-5 stroke-[2.5px]" />
					</Button>
					<BentoItemControls
						item={item}
						breakpoint={breakpoint}
						onCommand={onCommand}
						onRefreshLinkMetadata={onRefreshLinkMetadata}
					/>
				</>
			) : null}
		</>
	);
	const shellRef = useRef<HTMLDivElement>(null);
	return (
		<div
			ref={shellRef}
			data-bento-item-shell="true"
			data-bento-item-id={item.id}
			data-bento-item-type={item.type}
			data-bento-item-preset={preset ?? "unsupported"}
			className="group/bento-item bento-item-pop-in relative size-full overflow-visible rounded-2xl transition-[z-index] focus-within:z-50 hover:z-50"
		>
			{item.type === "media" ? (
				<MediaCropProvider containerRef={shellRef} breakpoint={breakpoint}>
					{content}
				</MediaCropProvider>
			) : (
				content
			)}
		</div>
	);
}
