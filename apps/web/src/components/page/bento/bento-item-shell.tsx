"use client";

import { inferPresetFromLayout } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { TrashIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import BentoItemControls from "../bento-item-controls";
import { RuntimeFallback, renderItem } from "./bento-item-registry";
import { MapItemInteractionProvider } from "./items/map-item-interaction-context";
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

function getForegroundColor(value: string | undefined) {
	if (!value) return undefined;
	if (
		value === "bg-white" ||
		value === "bg-gray-50" ||
		value === "bg-neutral-50"
	) {
		return "#000";
	}
	if (value === "bg-black" || value === "bg-foreground") return "#fff";
	if (!value.startsWith("#")) return undefined;
	const hex = value.slice(1, 7);
	if (hex.length !== 6 || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;
	const channels = [0, 2, 4].map((offset) => {
		const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return channel <= 0.03928
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4;
	});
	const luminance =
		channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
	return luminance > 0.45 ? "#000" : "#fff";
}

export function BentoItemShell({
	item,
	breakpoint,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
	onRefreshLinkMetadata,
	onLinkImageSelect,
	isAnyItemDragging = false,
	isEntering = false,
	isExiting = false,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
	isAnyItemDragging?: boolean;
	isEntering?: boolean;
	isExiting?: boolean;
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
	const cardBackground =
		getBackgroundColor(item.style.backgroundColor) ?? linkTheme?.cardBackground;
	const cardStyle: CSSProperties = {
		backgroundColor: cardBackground,
		...(item.type === "text"
			? ({
					"--text-card-background": cardBackground ?? "var(--background)",
				} as CSSProperties)
			: {}),
		...(linkTheme
			? ({
					"--link-card-background": linkTheme.cardBackground,
				} as CSSProperties)
			: {}),
		color:
			item.type === "text"
				? getForegroundColor(item.style.backgroundColor)
				: undefined,
	};
	const cardRadiusClass = "rounded-2xl";
	const backgroundColor = item.style.backgroundColor?.toLowerCase();
	const isWhiteBackground =
		backgroundColor === "bg-white" ||
		/^#(?:f{3}|f{4}|f{6}|f{8})$/.test(backgroundColor ?? "");
	const hasTextSurface =
		item.type === "text" && Boolean(backgroundColor) && !isWhiteBackground;
	const showControls =
		mode === "edit" && onCommand && item.type !== "section" && !isExiting;
	const shellRef = useRef<HTMLDivElement>(null);
	const hideControlsTimer = useRef<number | null>(null);
	const [controlsOpen, setControlsOpen] = useState(false);

	useEffect(() => {
		return () => {
			if (hideControlsTimer.current !== null) {
				window.clearTimeout(hideControlsTimer.current);
			}
		};
	}, []);

	useEffect(() => {
		if (showControls && !isAnyItemDragging && !isExiting) return;
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
			hideControlsTimer.current = null;
		}
		setControlsOpen(false);
	}, [isAnyItemDragging, isExiting, showControls]);

	const openControls = () => {
		if (!showControls || isAnyItemDragging || isExiting) return;
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
			hideControlsTimer.current = null;
		}
		setControlsOpen(true);
	};
	const scheduleCloseControls = () => {
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
		}
		hideControlsTimer.current = window.setTimeout(() => {
			setControlsOpen(false);
			hideControlsTimer.current = null;
		}, 120);
	};
	const content = (
		<>
			<div
				data-bento-item-card="true"
				className={`bento-item-card smooth-shadow-ring-sm relative size-full overflow-hidden ${cardRadiusClass} bg-background ${hasTextSurface ? "surface-line" : ""} ${linkTheme ? "link-card-themed" : ""}`}
				style={cardStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{preset ? (
						renderItem(item, preset, {
							mode,
							autoFocus,
							onAutoFocus,
							onCommand,
							onLinkImageSelect,
							isAnyItemDragging,
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
						variant="outline"
						size="icon-sm"
						aria-label="Delete item"
						title="Delete item"
						data-bento-item-delete-control="true"
						onClick={() => onCommand({ type: "delete-item", itemId: item.id })}
						className={`pointer-events-none absolute -top-4 -right-4 z-20 size-10 cursor-pointer! rounded-full p-1 opacity-0 transition-[opacity,transform,scale] duration-150 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 group-hover/bento-item:pointer-events-auto group-hover/bento-item:scale-100 group-hover/bento-item:opacity-100 motion-reduce:transition-none ${isAnyItemDragging || isExiting ? "pointer-events-none! opacity-0!" : ""}`}
					>
						<TrashIcon className="size-5 stroke-[2.5px]" />
					</Button>
					{showControls ? (
						<BentoItemControls
							item={item}
							breakpoint={breakpoint}
							onCommand={onCommand}
							onRefreshLinkMetadata={onRefreshLinkMetadata}
						/>
					) : null}
				</>
			) : null}
		</>
	);
	return (
		<div
			ref={shellRef}
			data-bento-item-shell="true"
			data-bento-item-controls-open={controlsOpen ? "true" : undefined}
			data-bento-item-id={item.id}
			data-bento-item-type={item.type}
			data-bento-item-preset={preset ?? "unsupported"}
			onPointerEnter={openControls}
			onPointerLeave={(event) => {
				if (
					event.relatedTarget instanceof Node &&
					shellRef.current?.contains(event.relatedTarget)
				) {
					return;
				}
				scheduleCloseControls();
			}}
			className={`group/bento-item bento-item-pop-in relative size-full overflow-visible ${cardRadiusClass} transition-[z-index] focus-within:z-50 hover:z-50 ${isEntering ? "is-entering" : ""} ${isExiting ? "is-exiting" : ""}`}
		>
			{item.type === "map" ? (
				<MapItemInteractionProvider>{content}</MapItemInteractionProvider>
			) : item.type === "media" ? (
				<MediaCropProvider containerRef={shellRef} breakpoint={breakpoint}>
					{content}
				</MediaCropProvider>
			) : (
				content
			)}
		</div>
	);
}
