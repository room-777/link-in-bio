"use client";

import { env } from "@grabbin/env/web";
import MapboxMap from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { type ReactNode, useRef, useState } from "react";
import { CircleArrowRightUp } from "reicon-react";
import {
	getCenteredMediaCrop,
	getMediaCropStyle,
	moveMediaCrop,
} from "@/lib/bento/media-crop";
import { MAPBOX_STYLE_CONFIG, MAPBOX_STYLE_URL } from "@/lib/map-config";

type BlockType = "link" | "media" | "map" | "text" | "section";
type Preset =
	| "squareSmall"
	| "halfBanner"
	| "landscape"
	| "portrait"
	| "squareLarge";
const allPresets: readonly Preset[] = [
	"squareSmall",
	"halfBanner",
	"landscape",
	"portrait",
	"squareLarge",
];
const mediaPresets: readonly Preset[] = [
	"squareSmall",
	"landscape",
	"portrait",
	"squareLarge",
];

const sizes: Record<Preset, { width: number; height: number; label: string }> =
	{
		squareSmall: { width: 172, height: 172, label: "Small square" },
		halfBanner: { width: 380, height: 68, label: "Half banner" },
		landscape: { width: 380, height: 172, label: "Landscape" },
		portrait: { width: 172, height: 380, label: "Portrait" },
		squareLarge: { width: 380, height: 380, label: "Large square" },
	};

const imageUrl =
	"https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80";
const mediaUrl =
	"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85";
const provider = {
	url: "https://instagram.com/averyreed",
	metadata: {
		title: "Daily moments",
		description: "Photos, places, and little things.",
		imageUrl,
		faviconUrl: "/api/provider-icons/instagram.svg",
		provider: "instagram",
		providerData: {
			followerCount: 12800,
		},
		presentation: {
			provider: "instagram",
			providerLabel: "Instagram",
			cardBackground: "#ffffff",
			actionBackground: "#3797f0",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionDetail: "12.8K",
			actionVariant: "solid",
			imageUrls: [imageUrl],
		},
	},
} as const;

function PreviewFrame({
	type,
	children,
}: {
	type: BlockType;
	children: ReactNode;
}) {
	return (
		<figure
			aria-label={`Interactive ${type} block preview`}
			className="smooth-shadow-ring-xs my-6 flex aspect-video min-h-[428px] w-full items-center justify-center rounded-md bg-secondary/10"
		>
			{children}
		</figure>
	);
}

function SizeControls({
	preset,
	onSelect,
	options = allPresets,
}: {
	preset: Preset;
	onSelect: (preset: Preset) => void;
	options?: readonly Preset[];
}) {
	return (
		<div className="flex items-center gap-1">
			{options.map((option) => (
				<button
					key={option}
					type="button"
					aria-label={sizes[option].label}
					aria-pressed={preset === option}
					title={sizes[option].label}
					onClick={() => onSelect(option)}
					className="size-8 cursor-pointer rounded-md text-primary-foreground text-xs transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white aria-pressed:bg-primary-foreground aria-pressed:text-primary"
				>
					{option === "squareSmall"
						? "▢"
						: option === "halfBanner"
							? "▰"
							: option === "landscape"
								? "▬"
								: option === "portrait"
									? "▯"
									: "▣"}
				</button>
			))}
		</div>
	);
}

function PreviewCard({
	preset,
	onPresetChange,
	children,
	className = "",
	options = allPresets,
	extraControls,
}: {
	preset: Preset;
	onPresetChange: (preset: Preset) => void;
	children: ReactNode;
	className?: string;
	options?: readonly Preset[];
	extraControls?: ReactNode;
}) {
	const size = sizes[preset];
	return (
		<div
			className="group/preview relative shrink-0 transition-[width,height] duration-[320ms] ease-[cubic-bezier(0.34,1.25,0.64,1)] motion-reduce:transition-none"
			style={{ width: size.width, height: size.height }}
		>
			<div
				className={`bento-item-card smooth-shadow-ring-sm relative size-full overflow-hidden rounded-2xl bg-background transition-[transform,box-shadow] duration-[320ms] ease-[cubic-bezier(0.34,1.25,0.64,1)] motion-reduce:transition-none ${className}`}
			>
				{children}
			</div>
			<div className="absolute top-full left-1/2 z-20 mt-2 flex h-10 w-max -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg bg-foreground/95 p-1 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/preview:opacity-100 group-hover/preview:opacity-100 motion-reduce:transition-none">
				<SizeControls
					preset={preset}
					onSelect={onPresetChange}
					options={options}
				/>
				{extraControls}
			</div>
		</div>
	);
}

function LinkBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [faviconFailed, setFaviconFailed] = useState(true);
	const presentation = provider.metadata.presentation;
	const isLandscape = preset === "landscape";
	const isHalfBanner = preset === "halfBanner";
	const isTall = preset === "portrait" || preset === "squareLarge";
	const showImage = isLandscape || isTall;
	const badge = (
		<a
			href={provider.url}
			target="_blank"
			rel="noreferrer"
			className={`inline-flex shrink-0 items-center justify-center text-center transition-transform hover:scale-105 ${faviconFailed ? "size-11 rounded-2xl px-2 font-semibold text-xs" : "size-8 rounded-md"}`}
			style={
				faviconFailed
					? { backgroundColor: presentation.cardBackground }
					: undefined
			}
			aria-label={`Open ${presentation.providerLabel}`}
		>
			{faviconFailed ? (
				<span aria-hidden="true">{presentation.providerLabel.slice(0, 1)}</span>
			) : (
				<img
					src={`${provider.metadata.faviconUrl}?v=3`}
					alt=""
					className="size-full object-contain"
					onError={() => setFaviconFailed(true)}
				/>
			)}
		</a>
	);
	const title = (
		<p
			className={`field-sizing-fixed block min-h-0 w-full min-w-24 max-w-full rounded-sm px-1 py-0 font-medium text-foreground text-sm ${isHalfBanner ? "h-8 max-h-8 overflow-hidden whitespace-nowrap leading-8" : "max-h-full overflow-y-auto whitespace-pre-line leading-5"}`}
		>
			{provider.metadata.title}
		</p>
	);
	const action = (
		<a
			href={provider.url}
			target="_blank"
			rel="noreferrer"
			aria-label={`${presentation.actionLabel} ${presentation.actionDetail}`}
			className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-3 font-medium text-sm shadow-none transition-all duration-150 ease-in-out"
			style={{
				backgroundColor: presentation.actionBackground,
				color: presentation.actionText,
			}}
		>
			<span>{presentation.actionLabel}</span>
			<span className="ml-1 opacity-70">{presentation.actionDetail}</span>
		</a>
	);
	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			className="bg-white"
		>
			{preset === "squareSmall" ? (
				<div
					data-provider={provider.metadata.provider}
					className="flex size-full min-h-0 flex-col items-start justify-between gap-2 p-4"
				>
					<div className="flex min-h-0 w-full flex-1 flex-col gap-1">
						{badge}
						{title}
					</div>
					{action}
				</div>
			) : isHalfBanner ? (
				<div
					data-provider={provider.metadata.provider}
					className="flex size-full min-h-0 items-center justify-between gap-1 p-4"
				>
					<div className="flex min-w-0 flex-1 items-center gap-1">
						{badge}
						<div className="min-h-0 min-w-0 flex-1">{title}</div>
					</div>
					{action}
				</div>
			) : (
				<div
					data-provider={provider.metadata.provider}
					className={`flex size-full min-h-0 min-w-0 gap-3 p-4 ${isLandscape ? "flex-row-reverse items-stretch" : "flex-col"}`}
				>
					{showImage ? (
						<div
							className={`relative min-h-0 min-w-0 overflow-hidden rounded-lg bg-muted/30 ${isTall ? "flex-3" : "flex-4"}`}
						>
							<img
								src={presentation.imageUrls[0]}
								alt="Flowers in a garden"
								className="size-full object-cover"
							/>
						</div>
					) : null}
					<div
						className={`flex min-h-0 min-w-0 flex-col items-start gap-2 ${isLandscape ? "h-full flex-4 items-stretch justify-between" : "flex-3 items-stretch justify-between"}`}
					>
						<div
							className={`flex min-h-0 min-w-0 flex-col items-start gap-1 ${isLandscape ? "w-full flex-1" : "flex-1 items-stretch"}`}
						>
							{badge}
							{title}
						</div>
						{action}
					</div>
				</div>
			)}
		</PreviewCard>
	);
}

function MediaBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [cropOpen, setCropOpen] = useState(false);
	const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
	const [draftCrop, setDraftCrop] = useState<
		{ x: number; y: number; width: number; height: number } | undefined
	>();
	const frameRef = useRef<HTMLDivElement>(null);
	const dragStart = useRef<{
		x: number;
		y: number;
		crop: { x: number; y: number; width: number; height: number };
	} | null>(null);
	const size = sizes[preset];
	const centeredCrop =
		sourceSize.width > 0 ? getCenteredMediaCrop(sourceSize, size) : undefined;
	const currentCrop = cropOpen ? (draftCrop ?? centeredCrop) : undefined;
	const cropStyle = currentCrop ? getMediaCropStyle(currentCrop) : undefined;

	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			options={mediaPresets}
			className={
				cropOpen
					? "!shadow-xl overflow-visible! z-10 translate-y-[-8px] scale-[1.02] ring-3 ring-black"
					: ""
			}
			extraControls={
				<button
					type="button"
					aria-label={cropOpen ? "Apply media crop" : "Crop media"}
					aria-pressed={cropOpen}
					onClick={() => {
						if (cropOpen) {
							dragStart.current = null;
						} else {
							setDraftCrop(centeredCrop);
						}
						setCropOpen(!cropOpen);
					}}
					className="h-8 cursor-pointer rounded-md px-2 text-primary-foreground text-xs hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white aria-pressed:bg-brand-green"
				>
					{cropOpen ? "Apply" : "Crop"}
				</button>
			}
		>
			<div
				ref={frameRef}
				data-media-frame="true"
				data-media-preset={preset}
				className={`relative size-full rounded-[inherit] bg-muted/30 ${cropOpen ? "overflow-visible!" : "overflow-hidden"}`}
			>
				<div
					className={`absolute overflow-hidden rounded-[inherit] ${cropOpen ? "smooth-shadow-lg" : ""}`}
					style={cropOpen && cropStyle ? cropStyle : { inset: 0 }}
				>
					<img
						src={mediaUrl}
						alt="A quiet morning in Kyoto"
						className="pointer-events-none size-full object-cover"
						onLoad={(event) =>
							setSourceSize({
								width: event.currentTarget.naturalWidth,
								height: event.currentTarget.naturalHeight,
							})
						}
					/>
					{cropOpen && currentCrop ? (
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
						>
							<span
								className="absolute rounded-[inherit]"
								style={{
									left: `${currentCrop.x}%`,
									top: `${currentCrop.y}%`,
									width: `${currentCrop.width}%`,
									height: `${currentCrop.height}%`,
									boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
								}}
							/>
						</div>
					) : null}
				</div>
				{cropOpen && cropStyle && currentCrop ? (
					<>
						<button
							type="button"
							aria-label="Drag media to crop"
							className="absolute z-20 cursor-grab touch-none rounded-[inherit] border-0 bg-transparent p-0"
							style={cropStyle}
							onPointerDown={(event) => {
								dragStart.current = {
									x: event.clientX,
									y: event.clientY,
									crop: currentCrop,
								};
								event.currentTarget.setPointerCapture(event.pointerId);
							}}
							onPointerMove={(event) => {
								const drag = dragStart.current;
								if (!drag) return;
								setDraftCrop(
									moveMediaCrop(
										drag.crop,
										event.clientX - drag.x,
										event.clientY - drag.y,
										size,
									),
								);
							}}
							onPointerUp={() => {
								dragStart.current = null;
							}}
						/>
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] border-[3px] border-black"
						/>
					</>
				) : null}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-3 p-4 text-white">
					<p className="flex h-7.5 w-fit min-w-0 max-w-full items-center rounded-md border border-border bg-white/80 px-2 py-0 font-medium text-foreground text-sm backdrop-blur-sm">
						<span className="block min-w-0 flex-1 truncate">
							A quiet morning in Kyoto
						</span>
					</p>
				</div>
			</div>
		</PreviewCard>
	);
}

function MapBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [moving, setMoving] = useState(false);
	const [mapLoaded, setMapLoaded] = useState(false);
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			options={mediaPresets}
			className={
				moving
					? "!shadow-xl z-10 translate-y-[-8px] scale-[1.02] ring-3 ring-black"
					: ""
			}
		>
			<div
				className={`relative size-full overflow-hidden rounded-[inherit] bg-secondary ${mapLoaded ? "surface-line" : ""} ${moving ? "cursor-grab" : ""}`}
			>
				{accessToken ? (
					<div
						className={`absolute inset-0 ${moving ? "" : "pointer-events-none"}`}
					>
						<MapboxMap
							mapLib={import("mapbox-gl")}
							mapboxAccessToken={accessToken}
							mapStyle={MAPBOX_STYLE_URL}
							{...({ config: MAPBOX_STYLE_CONFIG } as const)}
							initialViewState={{
								latitude: 35.0116,
								longitude: 135.7681,
								zoom: 12,
							}}
							attributionControl={false}
							interactive={moving}
							projection="mercator"
							pitch={0}
							bearing={0}
							dragRotate={false}
							touchPitch={false}
							style={{ height: "100%", width: "100%" }}
							onLoad={(event) => {
								event.target.resize();
								setMapLoaded(true);
							}}
						/>
					</div>
				) : null}
				{mapLoaded ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
					>
						<span className="animation-duration-[2.5s] absolute size-12 animate-ping rounded-full bg-brand/35" />
						<span className="beautiful-shadow smooth-ring-neutral-300/40! relative size-7 rounded-full bg-white p-1 drop-shadow-lg">
							<span className="block size-full rounded-full bg-brand" />
						</span>
					</div>
				) : null}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-w-0 items-center gap-3 p-4 text-white">
					<p className="flex h-7.5 w-fit min-w-0 max-w-[calc(100%-4.5rem)] items-center rounded-md border border-border bg-white/80 px-2 py-0 font-medium text-foreground text-sm backdrop-blur-sm">
						<span className="block min-w-0 flex-1 truncate">
							Currently dreaming of Kyoto
						</span>
					</p>
				</div>
				<div className="pointer-events-none absolute right-3 bottom-4 z-20">
					<div className="pointer-events-auto flex h-fit items-center">
						<a
							href="https://www.google.com/maps?q=35.0116,135.7681"
							target="_blank"
							rel="noreferrer"
							aria-label="Open location in Google Maps"
							className="group inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white font-medium text-black text-xs shadow-md backdrop-blur-sm transition-colors hover:bg-white/60"
						>
							<CircleArrowRightUp
								aria-hidden="true"
								size={28}
								weight="Filled"
							/>
						</a>
					</div>
				</div>
				<button
					type="button"
					aria-label={moving ? "Finish moving map" : "Move map"}
					aria-pressed={moving}
					onClick={() => setMoving((current) => !current)}
					className={`absolute top-3 right-3 z-20 rounded-md bg-foreground/95 px-3 py-2 text-primary-foreground text-xs shadow-lg transition-opacity duration-150 ${moving ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 group-focus-within/preview:pointer-events-auto group-focus-within/preview:opacity-100 group-hover/preview:pointer-events-auto group-hover/preview:opacity-100"}`}
				>
					{moving ? "Done" : "Move map"}
				</button>
			</div>
		</PreviewCard>
	);
}

function TextBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [text, setText] = useState(
		"Collecting small moments, good light, and places worth coming back to.",
	);
	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			className="bg-white text-foreground"
		>
			<div className="grid-action relative flex size-full min-h-0 flex-col gap-3 overflow-hidden rounded-lg p-3">
				<textarea
					aria-label="Text block content"
					value={text}
					onChange={(event) => setText(event.target.value)}
					className="bento-text-input field-sizing-content max-h-full min-h-0 w-full flex-1 cursor-text resize-none overflow-y-auto overscroll-contain whitespace-pre-wrap break-all rounded-lg border-0 bg-transparent p-1 px-2 font-medium text-current text-lg leading-7 outline-none placeholder:text-current/45 focus-visible:ring-0"
				/>
			</div>
		</PreviewCard>
	);
}

function SectionBlock() {
	const [title, setTitle] = useState("A little about me");
	return (
		<div className="smooth-shadow-ring-sm relative flex h-[68px] w-[380px] shrink-0 items-center overflow-hidden rounded-2xl bg-background p-3">
			<input
				aria-label="Section title"
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				className="h-full w-full min-w-32 max-w-full truncate rounded-2xl px-2 text-left font-bold text-xl tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
			/>
		</div>
	);
}

export default function UpdateBlockPreview({ type }: { type: BlockType }) {
	return (
		<PreviewFrame type={type}>
			{type === "link" ? <LinkBlock /> : null}
			{type === "media" ? <MediaBlock /> : null}
			{type === "map" ? <MapBlock /> : null}
			{type === "text" ? <TextBlock /> : null}
			{type === "section" ? <SectionBlock /> : null}
		</PreviewFrame>
	);
}
