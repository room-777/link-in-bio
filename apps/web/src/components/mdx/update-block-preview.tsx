"use client";

import { type ReactNode, useRef, useState } from "react";

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

const imageUrl = "/media-widget.png";
const mediaUrl = "/media-widget-sunset.png";
const provider = {
	url: "https://www.instagram.com/example",
	metadata: {
		title: "@framebyjune",
		faviconUrl: "/api/provider-icons/instagram.svg",
		provider: "instagram",
		providerData: {
			followerCount: 687000000,
			followerCountLabel: "687M",
			followerCountApproximate: true,
		},
		presentation: {
			provider: "instagram",
			providerLabel: "Instagram",
			cardBackground: "#fff2f8",
			actionBackground: "#e1306c",
			actionText: "#ffffff",
			actionLabel: "Follow",
			actionDetail: "687M",
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
			className={`group/preview smooth-shadow-ring-sm relative shrink-0 rounded-2xl bg-background transition-[width,height,transform,box-shadow] duration-[320ms] ease-[cubic-bezier(0.34,1.25,0.64,1)] motion-reduce:transition-none ${className}`}
			style={{ width: size.width, height: size.height }}
		>
			{children}
			<div className="absolute top-[calc(100%+0.5rem)] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-foreground/95 p-1 opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/preview:opacity-100 group-hover/preview:opacity-100">
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
	const presentation = provider.metadata.presentation;
	const providerData = provider.metadata.providerData;
	const isTall = preset === "portrait" || preset === "squareLarge";
	const showImage = preset !== "squareSmall" && preset !== "halfBanner";
	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			className="bg-[#fff2f8]"
		>
			<div
				data-provider={provider.metadata.provider}
				className={`flex size-full min-h-0 gap-3 p-4 ${isTall ? "flex-col" : "flex-row-reverse"}`}
			>
				{showImage ? (
					<div className="min-h-0 min-w-0 flex-[4] overflow-hidden rounded-lg bg-muted/30">
						<img
							src={presentation.imageUrls[0]}
							alt="Instagram creator preview"
							className="size-full object-cover"
						/>
					</div>
				) : null}
				<div className="flex min-w-0 flex-[3] flex-col justify-between gap-2">
					<div className="flex min-w-0 flex-col gap-1">
						<a
							href={provider.url}
							target="_blank"
							rel="noreferrer"
							className="flex size-8 items-center justify-center rounded-md"
							aria-label={`Open ${provider.metadata.presentation.providerLabel}`}
						>
							<img
								src={provider.metadata.faviconUrl}
								alt=""
								className="size-full object-contain"
							/>
						</a>
						<p className="truncate font-semibold text-sm">
							{provider.metadata.title}
						</p>
						<p className="text-muted-foreground text-xs">
							{provider.metadata.presentation.providerLabel}
						</p>
						<p className="text-muted-foreground text-xs">
							{providerData.followerCountApproximate ? "About " : ""}
							{providerData.followerCountLabel ||
								providerData.followerCount.toLocaleString()}{" "}
							followers
						</p>
					</div>
					<a
						href={provider.url}
						target="_blank"
						rel="noreferrer"
						data-action-variant={presentation.actionVariant}
						className="flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm text-white"
						style={{
							backgroundColor: presentation.actionBackground,
							color: presentation.actionText,
						}}
					>
						<span>{presentation.actionLabel}</span>
						<span>{presentation.actionDetail}</span>
					</a>
				</div>
			</div>
		</PreviewCard>
	);
}

function MediaBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [cropOpen, setCropOpen] = useState(false);
	const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
	const [draftOffset, setDraftOffset] = useState(cropOffset);
	const dragStart = useRef<{
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
	} | null>(null);
	const size = sizes[preset];
	const imageSize = Math.max(size.width, size.height);

	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			options={mediaPresets}
			className={
				cropOpen
					? "!shadow-xl z-10 translate-y-[-8px] scale-[1.02] ring-3 ring-black"
					: ""
			}
			extraControls={
				<button
					type="button"
					aria-label={cropOpen ? "Apply media crop" : "Crop media"}
					aria-pressed={cropOpen}
					onClick={() => {
						if (cropOpen) setCropOffset(draftOffset);
						else setDraftOffset(cropOffset);
						setCropOpen(!cropOpen);
					}}
					className="h-8 cursor-pointer rounded-md px-2 text-primary-foreground text-xs hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white aria-pressed:bg-brand-green"
				>
					{cropOpen ? "Apply" : "Crop"}
				</button>
			}
		>
			<div
				data-media-frame="true"
				className={`relative size-full rounded-[inherit] ${cropOpen ? "overflow-visible" : "overflow-hidden"}`}
			>
				<div
					className="absolute touch-none select-none"
					style={{
						left: cropOpen ? (size.width - imageSize) / 2 + draftOffset.x : 0,
						top: cropOpen ? (size.height - imageSize) / 2 + draftOffset.y : 0,
						width: cropOpen ? imageSize : size.width,
						height: cropOpen ? imageSize : size.height,
					}}
					onPointerDown={(event) => {
						if (!cropOpen) return;
						dragStart.current = {
							x: event.clientX,
							y: event.clientY,
							offsetX: draftOffset.x,
							offsetY: draftOffset.y,
						};
						event.currentTarget.setPointerCapture(event.pointerId);
					}}
					onPointerMove={(event) => {
						if (!dragStart.current) return;
						setDraftOffset({
							x:
								dragStart.current.offsetX + event.clientX - dragStart.current.x,
							y:
								dragStart.current.offsetY + event.clientY - dragStart.current.y,
						});
					}}
					onPointerUp={() => {
						dragStart.current = null;
					}}
				>
					<img
						src={mediaUrl}
						alt="A quiet evening in the city"
						className="size-full object-cover"
					/>
				</div>
				{cropOpen ? (
					<div className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-black shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
				) : null}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
					<span className="rounded-md bg-background/90 px-2 py-1 text-xs">
						A quiet evening in the city
					</span>
					<a
						href="https://example.com/city-journal"
						target="_blank"
						rel="noreferrer"
						aria-label="Open media link"
						className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-foreground text-background"
					>
						↗
					</a>
				</div>
			</div>
		</PreviewCard>
	);
}

function MapBlock() {
	const [preset, setPreset] = useState<Preset>("landscape");
	const [moving, setMoving] = useState(false);
	const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
	const dragStart = useRef<{
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
	} | null>(null);
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
				className="relative size-full overflow-hidden rounded-[inherit] bg-[#dcefd9]"
				onPointerDown={(event) => {
					if (!moving) return;
					dragStart.current = {
						x: event.clientX,
						y: event.clientY,
						offsetX: mapOffset.x,
						offsetY: mapOffset.y,
					};
					event.currentTarget.setPointerCapture(event.pointerId);
				}}
				onPointerMove={(event) => {
					if (!dragStart.current) return;
					setMapOffset({
						x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
						y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
					});
				}}
				onPointerUp={() => {
					dragStart.current = null;
				}}
			>
				<div
					aria-hidden="true"
					className="absolute -inset-24"
					style={{
						transform: `translate(${mapOffset.x}px, ${mapOffset.y}px)`,
						backgroundImage:
							"linear-gradient(28deg, transparent 47%, #fff 48% 51%, transparent 52%), linear-gradient(90deg, transparent 44%, #f8f7ef 45% 48%, transparent 49%), linear-gradient(0deg, transparent 54%, #f8f7ef 55% 58%, transparent 59%), linear-gradient(138deg, transparent 48%, #fff 49% 50%, transparent 51%)",
						backgroundSize:
							"170px 140px, 130px 110px, 190px 130px, 220px 180px",
					}}
				/>
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="rounded-full bg-white p-1 shadow-md">
						<div className="size-4 rounded-full bg-[#3b82f6] ring-4 ring-white" />
					</div>
					<span className="absolute bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-6 font-semibold text-lg drop-shadow-sm">
						Seoul
					</span>
				</div>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-white text-xs">
					<span className="rounded-md bg-black/45 px-2 py-1">
						Seoul, South Korea
					</span>
					<a
						href="https://www.google.com/maps?q=37.566500,126.978000"
						target="_blank"
						rel="noreferrer"
						aria-label="Open location in Google Maps"
						className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-black text-white"
					>
						↗
					</a>
				</div>
				<button
					type="button"
					aria-label={moving ? "Finish moving map" : "Move map"}
					aria-pressed={moving}
					onClick={() => setMoving((current) => !current)}
					className="absolute top-3 right-3 rounded-md bg-black/80 px-2 py-1 text-white text-xs"
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
		"A collection of places, people, and small moments worth sharing.",
	);
	return (
		<PreviewCard
			preset={preset}
			onPresetChange={setPreset}
			className="bg-white text-foreground"
		>
			<div className="flex size-full min-h-0 flex-col justify-center gap-2 p-4">
				<textarea
					aria-label="Text block content"
					value={text}
					onChange={(event) => setText(event.target.value)}
					className="size-full resize-none overflow-auto rounded-lg border-0 bg-transparent p-1 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
				/>
				<a
					href="https://example.com/my-story"
					target="_blank"
					rel="noreferrer"
					aria-label="Open text link"
					className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-foreground text-background"
				>
					↗
				</a>
			</div>
		</PreviewCard>
	);
}

function SectionBlock() {
	const [title, setTitle] = useState("Places to remember");
	return (
		<div className="smooth-shadow-ring-sm relative h-[68px] w-[380px] shrink-0 rounded-2xl bg-background px-4">
			<input
				aria-label="Section title"
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				className="size-full min-w-0 truncate border-0 bg-transparent text-center font-bold text-xl tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
