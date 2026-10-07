"use client";

import {
	getAllowedPresets,
	inferPresetFromLayout,
} from "@grabbin/bento-layout";
import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@grabbin/ui/components/radio-group";
import { Separator } from "@grabbin/ui/components/separator";
import { cn } from "@grabbin/ui/lib/utils";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	AlignVerticalJustifyCenter,
	AlignVerticalJustifyEnd,
	AlignVerticalJustifyStart,
	Crop,
	Ellipsis,
	Expand,
	Link2,
	LocateFixed,
	Minus,
	Plus,
	RefreshCw,
	Search,
	Unlink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEmailOtpShake } from "@/hooks/use-email-otp-shake";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";
import BentoPresetIcon from "./bento-preset-icon";
import { useMapItemInteraction } from "./items/map-item-interaction-context";
import { MapLocationSearch } from "./items/map-location-search";
import { useOptionalMediaCrop } from "./items/media-crop-context";

import "@grabbin/ui/styles/email-otp-form.css";

const presetLabels = {
	fullBanner: "Full banner",
	halfBanner: "Half banner",
	squareSmall: "Small square",
	landscape: "Wide",
	squareLarge: "Full square",
	portrait: "Portrait",
} as const;

const backgroundColorOptions = [
	{ id: "white", label: "White", value: "#ffffff", className: "bg-white" },
	{ id: "gray", label: "Gray", value: "#d4d4d4", className: "bg-neutral-300" },
	{ id: "black", label: "Black", value: "#000000", className: "bg-black" },
	{ id: "red", label: "Red", value: "#ef4444", className: "bg-red-500" },
	{
		id: "orange",
		label: "Orange",
		value: "#f97316",
		className: "bg-orange-500",
	},
	{
		id: "yellow",
		label: "Yellow",
		value: "#eab308",
		className: "bg-yellow-500",
	},
	{ id: "green", label: "Green", value: "#22c55e", className: "bg-green-500" },
	{ id: "blue", label: "Blue", value: "#3b82f6", className: "bg-blue-500" },
	{
		id: "indigo",
		label: "Indigo",
		value: "#6366f1",
		className: "bg-indigo-500",
	},
	{
		id: "violet",
		label: "Violet",
		value: "#8b5cf6",
		className: "bg-violet-500",
	},
] as const;

function normalizeHexColor(value: string) {
	const match = value
		.trim()
		.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (!match) return null;
	const hex = match[1]?.toLowerCase();
	if (!hex) return null;
	return hex.length === 3 || hex.length === 4
		? `#${hex
				.split("")
				.map((character) => `${character}${character}`)
				.join("")}`
		: `#${hex}`;
}

function LinkControl({
	value,
	onCommit,
	onRefresh,
	isRefreshing = false,
	ariaLabel,
	allowEmpty = true,
	inputBackground = "bg-black/25",
}: {
	value: string;
	onCommit: (value: string) => void;
	onRefresh?: () => void | Promise<void>;
	isRefreshing?: boolean;
	ariaLabel: string;
	allowEmpty?: boolean;
	inputBackground?: string;
}) {
	const [open, setOpen] = useState(false);
	const [draftUrl, setDraftUrl] = useState(value);
	const [linkError, setLinkError] = useState(false);
	const [shakeKey, setShakeKey] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const invalidRef = useRef(false);
	const shakeRef = useEmailOtpShake(shakeKey);
	const hasUrl = value.trim().length > 0;

	useEffect(() => {
		setDraftUrl(value);
	}, [value]);

	useEffect(() => {
		if (!open) return;
		const frame = requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.setSelectionRange(draftUrl.length, draftUrl.length);
		});
		return () => cancelAnimationFrame(frame);
	}, [draftUrl.length, open]);

	const markInvalid = () => {
		invalidRef.current = true;
		setLinkError(true);
		setShakeKey((key) => key + 1);
		requestAnimationFrame(() => {
			const input = inputRef.current;
			if (!input) return;
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		});
	};
	const commitDraftUrl = (rawValue: string) => {
		const valueToCommit = rawValue.trim();
		if (!valueToCommit && allowEmpty) {
			invalidRef.current = false;
			setLinkError(false);
			onCommit("");
			return;
		}

		const normalizedUrl = normalizeHttpsUrl(valueToCommit);
		if (!normalizedUrl) {
			markInvalid();
			return;
		}

		invalidRef.current = false;
		setLinkError(false);
		setDraftUrl(normalizedUrl);
		onCommit(normalizedUrl);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && invalidRef.current) return;
				setOpen(nextOpen);
			}}
		>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={open}
						aria-label={ariaLabel}
						className={cn(
							"size-8 cursor-pointer! rounded-[0.5rem] border-0 bg-transparent p-1 text-primary-foreground shadow-none hover:bg-primary-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60",
							hasUrl && "!bg-green-400 !text-white hover:!bg-green-400",
						)}
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				{hasUrl ? (
					<Link2 className="size-5 -rotate-z-45 stroke-[2.5px]" />
				) : (
					<Unlink className="size-4 stroke-[2.5px]" />
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				side="bottom"
				sideOffset={10}
				positionerClassName="z-[100003]"
				className="grid-action z-50 flex h-10 w-64 flex-row items-center gap-1 rounded-[0.45rem] border-0 bg-foreground/95 p-1 shadow-lg ring-0 backdrop-blur-sm [--smooth-ring-width:0px]"
			>
				<div
					ref={shakeRef}
					className={cn("t-input min-w-0 flex-1", linkError && "is-error")}
				>
					<Input
						ref={inputRef}
						aria-label="Link URL"
						aria-invalid={linkError}
						value={draftUrl}
						placeholder="Add link..."
						className={`h-8 w-full border-0 ${inputBackground} text-primary-foreground placeholder:text-primary-foreground/45 hover:border-white/10 focus-visible:border-white/10 focus-visible:ring-0`}
						onChange={(event) => {
							setDraftUrl(event.target.value);
							invalidRef.current = false;
							setLinkError(false);
						}}
						onPaste={(event) => {
							const pastedValue = event.clipboardData.getData("text");
							if (!pastedValue) return;

							event.preventDefault();
							const input = event.currentTarget;
							const start = input.selectionStart ?? draftUrl.length;
							const end = input.selectionEnd ?? draftUrl.length;
							const nextValue = `${draftUrl.slice(0, start)}${pastedValue}${draftUrl.slice(end)}`;
							setDraftUrl(nextValue);
							commitDraftUrl(nextValue);
						}}
						onBlur={() => commitDraftUrl(draftUrl)}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
							if (event.key === "Escape") {
								event.preventDefault();
								invalidRef.current = false;
								setLinkError(false);
								setDraftUrl(value);
								setOpen(false);
							}
						}}
						autoComplete="url"
						inputMode="url"
					/>
				</div>
				{onRefresh ? (
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="Refresh link metadata"
						title="Refresh link metadata"
						disabled={isRefreshing}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary"
						onClick={() => void onRefresh()}
					>
						<RefreshCw
							className={
								isRefreshing
									? "size-4 animate-spin stroke-[2.5px]"
									: "size-4 stroke-[2.5px]"
							}
						/>
					</Button>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

function MapItemExtraControls() {
	const {
		setLocationEditing,
		disableLocationSearch,
		zoomIn,
		zoomOut,
		locate,
		selectLocation,
	} = useMapItemInteraction();
	const [searchOpen, setSearchOpen] = useState(false);
	const [mapControlsOpen, setMapControlsOpen] = useState(false);

	useEffect(() => {
		setLocationEditing(searchOpen || mapControlsOpen);
	}, [mapControlsOpen, searchOpen, setLocationEditing]);

	const keepOpenWhileEditingMap = (details: { reason: string; event: Event }) =>
		details.reason === "outside-press" &&
		details.event.target instanceof Element &&
		details.event.target.closest('[data-bento-item-type="map"]');

	return (
		<>
			<Popover
				open={mapControlsOpen}
				onOpenChange={(open, details) => {
					if (!open && keepOpenWhileEditingMap(details)) {
						details.cancel();
						return;
					}
					setMapControlsOpen(open);
					if (open) setSearchOpen(false);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={
								mapControlsOpen ? "Close map controls" : "Open map controls"
							}
							aria-pressed={mapControlsOpen}
							aria-expanded={mapControlsOpen}
							className={cn(
								"size-8 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60",
								mapControlsOpen &&
									"bg-brand-green! text-white! hover:bg-brand-green!",
							)}
						/>
					}
				>
					<Expand className="size-4 stroke-[2.5px]" aria-hidden="true" />
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					sideOffset={8}
					data-bento-item-drag-cancel="true"
					positionerClassName="z-[100003]"
					className="grid-action smooth-shadow-none! flex w-auto flex-row items-center gap-0.5 rounded-lg border-0 bg-black p-1 shadow-lg"
				>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Zoom out"
						title="Zoom out"
						onClick={zoomOut}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<Minus className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Zoom in"
						title="Zoom in"
						onClick={zoomIn}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<Plus className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Use current location"
						title="Use current location"
						onClick={locate}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<LocateFixed className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
				</PopoverContent>
			</Popover>
			<Popover
				open={searchOpen}
				onOpenChange={(open, details) => {
					if (!open && keepOpenWhileEditingMap(details)) {
						details.cancel();
						return;
					}
					setSearchOpen(open);
					if (open) setMapControlsOpen(false);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={
								searchOpen ? "Close location search" : "Search location"
							}
							aria-pressed={searchOpen}
							aria-expanded={searchOpen}
							className={cn(
								"size-8 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60",
								searchOpen &&
									"bg-brand-green! text-white! hover:bg-brand-green!",
							)}
						/>
					}
				>
					<Search className="size-4 stroke-[2.5px]" aria-hidden="true" />
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					sideOffset={8}
					data-bento-item-drag-cancel="true"
					positionerClassName="z-[100003]"
					className="grid-action w-64 rounded-lg border-0 bg-black p-1 shadow-lg"
				>
					<MapLocationSearch
						accessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
						disabled={disableLocationSearch}
						onSelect={selectLocation}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}

function TextStyleControls({
	item,
	onCommand,
	onManageLink,
}: {
	item: Extract<BentoItem, { type: "text" }>;
	onCommand: (command: BentoCommand) => void;
	onManageLink: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [draftColor, setDraftColor] = useState(
		item.style.backgroundColor ?? "#ffffff",
	);
	const backgroundColor = item.style.backgroundColor ?? "#ffffff";
	const selectedColor = backgroundColorOptions.find(
		(option) => option.value === backgroundColor,
	);

	useEffect(() => {
		setDraftColor(backgroundColor);
	}, [backgroundColor]);

	const updateStyle = (patch: BentoItem["style"]) =>
		onCommand({ type: "update-style", itemId: item.id, patch });
	const commitColor = () => {
		const color = normalizeHexColor(draftColor);
		if (color && color !== backgroundColor)
			updateStyle({ backgroundColor: color });
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setPaletteOpen(false);
			}}
		>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={open}
						aria-label="Open text style options"
						className="size-8 cursor-pointer! rounded-md border-0 bg-transparent p-0 text-primary-foreground shadow-none hover:bg-primary-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				<Ellipsis className="size-4 stroke-[2.5px]" aria-hidden="true" />
			</PopoverTrigger>
			<PopoverContent
				align="center"
				side="bottom"
				sideOffset={8}
				positionerClassName="z-[100003]"
				className="grid-action flex w-auto flex-col gap-2 overflow-hidden rounded-lg border-0 bg-foreground p-1 shadow-lg"
			>
				<div className="flex items-center gap-1">
					<fieldset
						className="flex items-center gap-1 border-0 p-0"
						aria-label="Text alignment"
					>
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label="Align text left"
							aria-pressed={
								item.style.textAlign === "left" || !item.style.textAlign
							}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "left" })}
						>
							<AlignLeft className="size-4 stroke-[2.5px]" aria-hidden="true" />
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text center"
							aria-pressed={item.style.textAlign === "center"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "center" })}
						>
							<AlignCenter
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text right"
							aria-pressed={item.style.textAlign === "right"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "right" })}
						>
							<AlignRight
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
					</fieldset>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<fieldset
						className="flex items-center gap-1 border-0 p-0"
						aria-label="Vertical alignment"
					>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the top"
							aria-pressed={
								item.style.verticalAlign === "top" || !item.style.verticalAlign
							}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "top" })}
						>
							<AlignVerticalJustifyStart
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the center"
							aria-pressed={item.style.verticalAlign === "center"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "center" })}
						>
							<AlignVerticalJustifyCenter
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the bottom"
							aria-pressed={item.style.verticalAlign === "bottom"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "bottom" })}
						>
							<AlignVerticalJustifyEnd
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
					</fieldset>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-expanded={paletteOpen}
						aria-label="Toggle text background color options"
						className="size-8 rounded-sm border-0 bg-transparent p-1 text-primary-foreground shadow-none hover:bg-background/30 focus-visible:ring-2 focus-visible:ring-ring/60"
						onClick={() => setPaletteOpen((current) => !current)}
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-full rounded-full border border-white/20",
								selectedColor?.className,
							)}
							style={{ backgroundColor }}
						/>
					</Button>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<LinkControl
						value={item.data.link ?? ""}
						onCommit={onManageLink}
						ariaLabel={item.data.link ? "Edit text link" : "Add text link"}
						inputBackground="bg-transparent"
					/>
				</div>
				{paletteOpen ? (
					<div className="flex flex-col gap-2 border-white/10 border-t">
						<RadioGroup
							aria-label="Text background color options"
							className="grid grid-cols-8 gap-1 p-1 pt-1.5"
							onValueChange={(value) => {
								const option = backgroundColorOptions.find(
									(candidate) => candidate.id === value,
								);
								if (!option) return;
								setDraftColor(option.value);
								updateStyle({ backgroundColor: option.value });
							}}
							value={selectedColor?.id ?? ""}
						>
							{backgroundColorOptions.map((option) => (
								<RadioGroupItem
									key={option.id}
									value={option.id}
									aria-label={option.label}
									className={cn(
										"size-7 shrink-0 cursor-pointer rounded-full border border-white/20 shadow-none transition-[transform,opacity] focus-visible:ring-2 focus-visible:ring-ring/50 data-checked:ring-2 data-checked:ring-white/90 [&_[data-slot=radio-group-indicator]]:hidden",
										option.className,
									)}
									style={{ backgroundColor: option.value }}
								/>
							))}
						</RadioGroup>
						<Input
							aria-label="Text background hex color"
							aria-invalid={
								draftColor.trim().length > 0 && !normalizeHexColor(draftColor)
							}
							value={draftColor}
							placeholder="#ffffff"
							className="h-8 border-white/10 bg-background/10 px-2 font-mono text-primary-foreground text-xs shadow-none focus-visible:ring-white/20"
							onChange={(event) => setDraftColor(event.target.value)}
							onBlur={commitColor}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitColor();
								}
								if (event.key === "Escape") setDraftColor(backgroundColor);
							}}
						/>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

function getLinkValue(item: BentoItem) {
	if (item.type === "link") return item.data.url;
	if (item.type === "text" || item.type === "media") {
		return item.data.link ?? "";
	}
	return null;
}

export default function BentoItemControls({
	item,
	breakpoint,
	onCommand,
	onRefreshLinkMetadata,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	onCommand: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
}) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const linkValue = getLinkValue(item);
	const currentPreset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);
	const mediaCrop = useOptionalMediaCrop();

	const commitLink = (nextUrl: string) => {
		const value = nextUrl.trim();
		if (item.type === "link") {
			const normalizedUrl = normalizeHttpsUrl(value);
			if (!normalizedUrl || normalizedUrl === item.data.url) return;
			onCommand({
				type: "update-data",
				itemId: item.id,
				data: { url: normalizedUrl },
			});
			return;
		}

		if (item.type !== "text" && item.type !== "media") return;
		if (!value) {
			onCommand({
				type: "update-data",
				itemId: item.id,
				data: { ...item.data, link: undefined },
			});
			return;
		}
		const normalizedUrl = normalizeHttpsUrl(value);
		if (!normalizedUrl || normalizedUrl === item.data.link) return;
		onCommand({
			type: "update-data",
			itemId: item.id,
			data: { ...item.data, link: normalizedUrl },
		});
	};

	const refreshMetadata = async () => {
		if (!onRefreshLinkMetadata || item.type !== "link") return;
		setIsRefreshing(true);
		try {
			await onRefreshLinkMetadata(item.id);
		} catch {
			// The store reports refresh failures with a toast.
		} finally {
			setIsRefreshing(false);
		}
	};

	const mediaCropControls = (() => {
		if (item.type !== "media" || !item.data.mediaUrl || !mediaCrop) {
			return null;
		}
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
	})();

	return (
		<div
			data-bento-item-controls="true"
			data-bento-item-drag-cancel="true"
			className="pointer-events-none absolute top-full left-1/2 z-[100002] mt-2 flex h-10 w-max -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-lg bg-foreground/95 p-1 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/bento-item:pointer-events-auto group-hover/bento-item:opacity-100 group-has-[button[aria-expanded=true]]/bento-item:pointer-events-auto group-has-[button[aria-expanded=true]]/bento-item:opacity-100 motion-reduce:transition-none"
		>
			{getAllowedPresets(item.type).map((preset) => (
				<Button
					key={preset}
					type="button"
					size="icon"
					variant="ghost"
					aria-label={presetLabels[preset]}
					aria-pressed={currentPreset === preset}
					title={presetLabels[preset]}
					className="size-8 cursor-pointer! rounded-md text-primary-foreground hover:bg-white/20 hover:text-primary-foreground aria-pressed:bg-primary-foreground aria-pressed:text-primary"
					onClick={() =>
						onCommand({
							type: "apply-preset",
							itemId: item.id,
							breakpoint,
							preset,
						})
					}
				>
					<BentoPresetIcon preset={preset} />
				</Button>
			))}
			{mediaCropControls}
			{item.type === "map" ? <MapItemExtraControls /> : null}
			{item.type === "text" ? (
				<TextStyleControls
					item={item}
					onCommand={onCommand}
					onManageLink={commitLink}
				/>
			) : null}
			{item.type !== "text" && linkValue !== null ? (
				<LinkControl
					value={linkValue}
					onCommit={commitLink}
					ariaLabel={
						item.type === "link"
							? "Edit link URL"
							: linkValue
								? "Edit media link"
								: "Add media link"
					}
					allowEmpty={item.type !== "link"}
					inputBackground="bg-transparent"
					onRefresh={
						item.type === "link" && onRefreshLinkMetadata
							? refreshMetadata
							: undefined
					}
					isRefreshing={isRefreshing}
				/>
			) : null}
		</div>
	);
}
