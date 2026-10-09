"use client";

import "@grabbin/ui/styles/bento-motion.css";

import {
	getBentoItemRadius,
	inferPresetFromLayout,
} from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { motion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { Trash } from "@/components/trash";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import BentoItemControls from "./bento-item-controls";
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
	children,
	handle,
	breakpoint,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
	onRefreshLinkMetadata,
	onLinkImageSelect,
	cardClassName,
	hasNestedLinks = false,
	disableCardLink = false,
	isAnyItemDragging = false,
	disableLocationSearch = false,
	isEntering = false,
	isExiting = false,
	isInitialEntryItem = false,
	entryReady = true,
	entryDelay = 0,
	reduceMotion = false,
	onEntryComplete,
}: {
	item: BentoItem;
	children?: ReactNode;
	handle?: string;
	breakpoint: "wide" | "compact";
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
	onLinkImageSelect?: (itemId: string, file: File) => void | Promise<void>;
	cardClassName?: string;
	hasNestedLinks?: boolean;
	disableCardLink?: boolean;
	isAnyItemDragging?: boolean;
	disableLocationSearch?: boolean;
	isEntering?: boolean;
	isExiting?: boolean;
	isInitialEntryItem?: boolean;
	entryReady?: boolean;
	entryDelay?: number;
	reduceMotion?: boolean;
	onEntryComplete?: () => void;
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
	const isRssFeedWidget =
		item.type === "link" && item.data.metadata?.provider === "rss-feed";
	const isTweetWidget =
		item.type === "link" && item.data.metadata?.provider === "tweet";
	const publicLink =
		mode === "view" &&
		!disableCardLink &&
		item.type === "link" &&
		!isRssFeedWidget &&
		!isTweetWidget
			? {
					href: item.data.url,
					title: item.data.metadata?.title?.trim() || item.data.url,
				}
			: undefined;
	const usesNestedLinks = hasNestedLinks;
	const usesCardLink = Boolean(publicLink && !usesNestedLinks);
	const Card = usesCardLink ? "a" : "div";
	const cardRadius = getBentoItemRadius(item.type, preset);
	const cardBorderColor =
		item.type === "map" || item.type === "media" || item.type === "section"
			? undefined
			: "var(--bento-item-border-color)";
	const cardStyle: CSSProperties = {
		borderRadius: cardRadius,
		...(cardBorderColor ? { borderColor: cardBorderColor } : {}),
		backgroundColor: publicLink ? undefined : cardBackground,
		...(item.type === "text"
			? ({
					"--text-card-background": cardBackground ?? "var(--background)",
				} as CSSProperties)
			: {}),
		...(item.type === "link"
			? ({
					"--link-card-background": cardBackground ?? "var(--background)",
				} as CSSProperties)
			: {}),
		color:
			item.type === "text"
				? getForegroundColor(item.style.backgroundColor)
				: undefined,
	};
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
			<Card
				data-bento-item-card="true"
				href={usesCardLink ? publicLink?.href : undefined}
				target={usesCardLink ? "_blank" : undefined}
				rel={usesCardLink ? "noreferrer" : undefined}
				aria-label={publicLink ? `Open ${publicLink.title}` : undefined}
				role={publicLink && usesNestedLinks ? "link" : undefined}
				tabIndex={publicLink && usesNestedLinks ? 0 : undefined}
				onClick={
					publicLink && usesNestedLinks
						? (event) => {
								if (
									event.target instanceof Element &&
									event.target.closest("a[href]")
								) {
									return;
								}
								window.open(publicLink.href, "_blank", "noopener,noreferrer");
							}
						: undefined
				}
				onKeyDown={
					publicLink && usesNestedLinks
						? (event) => {
								if (
									event.target !== event.currentTarget ||
									event.key !== "Enter"
								) {
									return;
								}
								event.preventDefault();
								window.open(publicLink.href, "_blank", "noopener,noreferrer");
							}
						: undefined
				}
				className={`bento-item-card relative size-full overflow-hidden bg-background ${publicLink ? "bento-link-card block cursor-pointer! touch-manipulation outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" : ""} ${hasTextSurface ? "surface-line" : ""} ${linkTheme ? "link-card-themed" : ""} ${cardClassName ?? ""}`}
				style={cardStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{children !== undefined ? (
						children
					) : preset ? (
						renderItem(item, preset, {
							handle,
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
			</Card>
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
						<Trash className="size-5 stroke-[2.5px]" />
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
		<motion.div
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
			className={`group/bento-item bento-item-pop-in relative size-full overflow-visible transition-[z-index] focus-within:z-50 hover:z-50 ${isEntering ? "is-entering" : ""} ${isExiting ? "is-exiting" : ""} ${isInitialEntryItem ? "bento-item-initial-entering" : ""}`}
			style={{ borderRadius: cardRadius }}
			initial={
				isInitialEntryItem && !reduceMotion
					? { opacity: 0, transform: "translateY(16px)" }
					: false
			}
			animate={
				isExiting
					? { opacity: 0, filter: "blur(2px)", y: 8, scale: 0.88 }
					: isInitialEntryItem && entryReady
						? { opacity: 1, transform: "translateY(0px)" }
						: undefined
			}
			transition={{
				duration: reduceMotion ? 0 : isExiting ? 0.18 : 0.8,
				delay: isExiting || reduceMotion ? 0 : entryDelay,
				ease: [0.2, 1, 0.3, 1],
			}}
			onAnimationComplete={onEntryComplete}
		>
			{item.type === "map" ? (
				<MapItemInteractionProvider
					disableLocationSearch={disableLocationSearch}
				>
					{content}
				</MapItemInteractionProvider>
			) : item.type === "media" ? (
				<MediaCropProvider containerRef={shellRef} breakpoint={breakpoint}>
					{content}
				</MediaCropProvider>
			) : (
				content
			)}
		</motion.div>
	);
}
