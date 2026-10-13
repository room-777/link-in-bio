"use client";

import type { PageItemResponse, ProviderData } from "@grabbin/api";
import { getBentoItemRadius, type PresetName } from "@grabbin/bento-layout";
import Image from "next/image";
import {
	type ComponentType,
	type CSSProperties,
	useEffect,
	useRef,
	useState,
} from "react";
import { Pause3 } from "reicon-react/icons/Pause3";
import { Play } from "reicon-react/icons/Play";
import { useSpotifyPlayer } from "@/hooks/use-audio-player";

type SpotifyLinkItem = Extract<PageItemResponse, { type: "link" }>;
type SpotifyTrack = NonNullable<
	NonNullable<ProviderData["spotify"]>["tracks"]
>[number];
type SpotifyPlaybackState = {
	canPlay: boolean;
	currentTrackIndex: number | null;
	isPlaying: boolean;
	progress: number;
	playTrack: (index: number) => void;
	togglePlayback: () => void;
};
type SpotifyWidgetProps = {
	spotifyUrl: string;
	imageUrl?: string;
	heading: string;
	artist?: string;
	type?: string;
	textColor?: string;
	subduedTextColor?: string;
	brightAccentColor?: string;
	backgroundColor?: string;
	backgroundTintedColor?: string;
	tracks: SpotifyTrack[];
	playback: SpotifyPlaybackState;
};
type SpotifyPreset = Exclude<PresetName, "fullBanner">;

function SpotifyBrandMark({
	color,
	url,
	overlay,
	inset,
}: {
	color: string;
	url: string;
	overlay?: boolean;
	inset?: boolean;
}) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Open in Spotify"
			onClick={(event) => event.stopPropagation()}
			className={`inline-flex size-4 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-[#1ed760] focus-visible:outline-offset-2 ${overlay ? (inset ? "absolute top-3 left-3" : "absolute top-2 left-2") : ""}`}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 256 256"
				preserveAspectRatio="xMidYMid"
				className="size-full"
			>
				<path
					d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z"
					fill={color}
				/>
			</svg>
			<span className="sr-only">Open in Spotify</span>
		</a>
	);
}

function SpotifyPlaybackButton({
	playback,
	color,
	overlay,
	compactOverlay = false,
}: {
	playback: SpotifyPlaybackState;
	color?: string;
	overlay?: boolean;
	compactOverlay?: boolean;
}) {
	const Icon = playback.isPlaying ? Pause3 : Play;
	const radius = compactOverlay ? 10 : 14;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - playback.progress);

	return (
		<button
			type="button"
			aria-label={
				playback.canPlay
					? playback.isPlaying
						? "Pause preview"
						: "Play preview"
					: "No preview available"
			}
			aria-pressed={playback.isPlaying}
			disabled={!playback.canPlay}
			onClick={(event) => {
				event.stopPropagation();
				playback.togglePlayback();
			}}
			style={{ color: color ?? "#1ED760" }}
			className={`z-10 grid ${compactOverlay ? "size-8" : "size-11"} shrink-0 place-items-center rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-[#1ed760] focus-visible:outline-offset-2 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${overlay ? (compactOverlay ? "absolute top-1 right-1" : "absolute top-2 right-2") : "relative"}`}
		>
			<span
				className={`absolute grid place-items-center ${compactOverlay ? "top-0 right-0 size-6" : overlay ? "top-0 right-0 size-8" : "inset-0"}`}
			>
				{playback.isPlaying ? (
					<svg
						aria-hidden="true"
						viewBox={compactOverlay ? "0 0 24 24" : "0 0 32 32"}
						className="pointer-events-none absolute inset-0 size-full -rotate-90"
					>
						<circle
							cx={compactOverlay ? "12" : "16"}
							cy={compactOverlay ? "12" : "16"}
							r={radius}
							fill="none"
							stroke="currentColor"
							strokeDasharray={circumference}
							strokeDashoffset={dashOffset}
							strokeLinecap="round"
							strokeWidth="2"
							className="transition-[stroke-dashoffset] duration-300 ease-linear"
						/>
					</svg>
				) : null}
				<Icon
					aria-hidden="true"
					size={
						compactOverlay
							? playback.isPlaying
								? 14
								: 16
							: playback.isPlaying
								? 18
								: 20
					}
					weight="Filled"
				/>
			</span>
		</button>
	);
}

function SpotifyControls({
	spotifyUrl,
	playback,
	color,
	brandColor = "#1ED760",
	className,
	overlay = false,
	insetBrandMark = false,
}: {
	spotifyUrl: string;
	playback: SpotifyPlaybackState;
	color?: string;
	brandColor?: string;
	className?: string;
	overlay?: boolean;
	insetBrandMark?: boolean;
}) {
	return (
		<div
			className={`flex items-center gap-2 ${overlay ? "absolute inset-0 z-10" : ""} ${className ?? ""}`}
		>
			<SpotifyBrandMark
				color={brandColor}
				url={spotifyUrl}
				overlay={overlay}
				inset={insetBrandMark}
			/>
			<SpotifyPlaybackButton
				playback={playback}
				color={color}
				overlay={overlay}
			/>
		</div>
	);
}

function spotifyColorToHex(color?: {
	alpha: number;
	red: number;
	green: number;
	blue: number;
}) {
	return color
		? `#${[color.red, color.green, color.blue, color.alpha]
				.map((channel) => channel.toString(16).padStart(2, "0"))
				.join("")}`
		: undefined;
}

function SpotifyHeading({
	heading,
	className,
	color,
}: {
	heading: string;
	className: string;
	color?: string;
}) {
	const viewportRef = useRef<HTMLHeadingElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const viewport = viewportRef.current;
		const text = textRef.current;
		if (!viewport || !text) return;

		const motionPreference = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		let animation: Animation | undefined;
		const update = () => {
			animation?.cancel();
			const style = window.getComputedStyle(viewport);
			const availableWidth =
				viewport.clientWidth -
				Number.parseFloat(style.paddingLeft) -
				Number.parseFloat(style.paddingRight);
			const distance = text.scrollWidth - availableWidth;
			setIsOverflowing(distance > 0);

			if (distance <= 0 || motionPreference.matches) return;

			animation = text.animate(
				[
					{ transform: "translateX(0)", offset: 0 },
					{ transform: "translateX(0)", offset: 0.1 },
					{ transform: `translateX(-${distance}px)`, offset: 0.5 },
					{ transform: `translateX(-${distance}px)`, offset: 0.6 },
					{ transform: "translateX(0)", offset: 1 },
				],
				{
					duration: 30_000,
					iterations: Number.POSITIVE_INFINITY,
					easing: "linear",
				},
			);
		};

		const resizeObserver = new ResizeObserver(update);
		resizeObserver.observe(viewport);
		resizeObserver.observe(text);
		motionPreference.addEventListener("change", update);
		update();

		return () => {
			animation?.cancel();
			resizeObserver.disconnect();
			motionPreference.removeEventListener("change", update);
		};
	}, []);

	return (
		<h3
			ref={viewportRef}
			title={heading}
			className={`${className} overflow-hidden whitespace-nowrap`}
			style={{
				color,
				...(isOverflowing
					? {
							maskImage:
								"linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
						}
					: {}),
			}}
		>
			<span ref={textRef} className="block w-max">
				{heading}
			</span>
		</h3>
	);
}

function SpotifyArtwork({
	imageUrl,
	className,
}: {
	imageUrl?: string;
	className: string;
}) {
	return imageUrl ? (
		<img
			src={imageUrl}
			alt=""
			aria-hidden="true"
			className={`${className} shrink-0 rounded-md bg-neutral-100 object-cover`}
		/>
	) : (
		<div
			aria-hidden="true"
			className={`${className} shrink-0 rounded-md bg-neutral-100`}
		/>
	);
}

function SpotifyFeaturedArtwork({
	spotifyUrl,
	imageUrl,
	heading,
	textColor,
	brandColor,
	gradientColor,
	playback,
	className,
}: {
	spotifyUrl: string;
	imageUrl?: string;
	heading: string;
	textColor?: string;
	brandColor: string;
	gradientColor?: string;
	playback: SpotifyPlaybackState;
	className: string;
}) {
	return (
		<div className={`relative overflow-hidden rounded-xl ${className}`}>
			<SpotifyArtwork
				imageUrl={imageUrl}
				className="absolute inset-0 size-full"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 z-0"
				style={{
					background: `linear-gradient(to top, color-mix(in srgb, ${gradientColor ?? "#000000"} 72%, transparent), transparent 65%)`,
				}}
			/>
			<SpotifyControls
				spotifyUrl={spotifyUrl}
				playback={playback}
				color={textColor ?? "#ffffff"}
				brandColor={brandColor}
				overlay
			/>
			<SpotifyHeading
				heading={heading}
				className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 font-semibold text-base text-white"
				color={textColor}
			/>
		</div>
	);
}

function SpotifyTrackList({
	tracks,
	playback,
	textColor,
	subduedTextColor,
	brightAccentColor,
	backgroundTintedColor,
}: {
	tracks: SpotifyTrack[];
	playback: SpotifyPlaybackState;
	textColor?: string;
	subduedTextColor?: string;
	brightAccentColor?: string;
	backgroundTintedColor?: string;
}) {
	return (
		<div className="scroll-fade-y scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
			{tracks.length ? (
				<ol className="space-y-1">
					{tracks.map((track, index) => {
						const isCurrent = playback.currentTrackIndex === index;
						return (
							<li key={track.uri}>
								<button
									type="button"
									aria-current={isCurrent ? "true" : undefined}
									disabled={!track.previewUrl}
									onClick={(event) => {
										event.stopPropagation();
										playback.playTrack(index);
									}}
									style={
										{
											color: isCurrent
												? brightAccentColor
												: (subduedTextColor ?? textColor),
											"--spotify-highlight-color":
												backgroundTintedColor ?? "rgb(255 255 255 / 0.1)",
										} as CSSProperties
									}
									className={`flex w-full flex-col items-start truncate rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--spotify-highlight-color)] focus-visible:bg-[var(--spotify-highlight-color)] focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${isCurrent && playback.isPlaying ? "bg-[var(--spotify-highlight-color)]" : ""}`}
								>
									<span className="w-full truncate text-sm">{track.name}</span>
									{track.artist ? (
										<span className="w-full truncate text-xs opacity-70">
											{track.artist}
										</span>
									) : null}
								</button>
							</li>
						);
					})}
				</ol>
			) : (
				<p className="px-2 py-1.5 text-sm" style={{ color: subduedTextColor }}>
					No tracks available
				</p>
			)}
		</div>
	);
}

function SpotifySquareSmall({
	spotifyUrl,
	imageUrl,
	heading,
	backgroundColor,
	textColor,
	brightAccentColor,
	playback,
}: SpotifyWidgetProps) {
	return (
		<article
			data-bento-preset="squareSmall"
			style={{
				borderRadius: getBentoItemRadius("link", "squareSmall"),
				backgroundColor,
			}}
			className={`relative size-full min-h-0 overflow-hidden bg-neutral-100 ${imageUrl ? "surface-line outline-depth" : ""}`}
		>
			{imageUrl ? (
				<Image
					src={imageUrl}
					alt=""
					aria-hidden="true"
					fill
					sizes="100vw"
					className="absolute inset-0 size-full object-cover"
				/>
			) : null}
			<SpotifyControls
				spotifyUrl={spotifyUrl}
				playback={playback}
				color={textColor}
				brandColor={brightAccentColor ?? "#1ED760"}
				overlay
				insetBrandMark
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0"
				style={{
					background: `linear-gradient(to top, color-mix(in srgb, ${backgroundColor ?? "#000000"} 72%, transparent), transparent 60%)`,
				}}
			/>
			<SpotifyHeading
				heading={heading}
				className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 font-medium text-base text-white"
				color={textColor}
			/>
		</article>
	);
}

function SpotifyHalfBanner({
	spotifyUrl,
	imageUrl,
	heading,
	artist,
	type,
	textColor,
	subduedTextColor,
	brightAccentColor,
	backgroundColor,
	tracks,
	playback,
}: SpotifyWidgetProps) {
	const currentTrack = tracks[playback.currentTrackIndex ?? 0];
	const subtitle =
		type === "artist" ? currentTrack?.name : (artist ?? currentTrack?.artist);

	return (
		<article
			data-bento-preset="halfBanner"
			style={{
				borderRadius: getBentoItemRadius("link", "halfBanner"),
				backgroundColor,
			}}
			className={`relative flex size-full min-h-0 items-center gap-3 overflow-hidden bg-white p-5 ${imageUrl ? "surface-line outline-depth" : ""}`}
		>
			<div className="size-10 shrink-0 rounded-md">
				<SpotifyArtwork imageUrl={imageUrl} className="size-full" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<SpotifyHeading
					heading={heading}
					className="w-full font-semibold text-sm leading-tight"
					color={textColor}
				/>
				{subtitle ? (
					<p
						className="truncate text-xs leading-tight"
						style={{ color: subduedTextColor ?? textColor }}
					>
						{subtitle}
					</p>
				) : null}
			</div>
			<SpotifyControls
				spotifyUrl={spotifyUrl}
				playback={playback}
				color={textColor}
				brandColor={brightAccentColor ?? "#1ED760"}
			/>
		</article>
	);
}

function SpotifyLandscape({
	spotifyUrl,
	imageUrl,
	heading,
	textColor,
	subduedTextColor,
	brightAccentColor,
	backgroundColor,
	backgroundTintedColor,
	tracks,
	playback,
}: SpotifyWidgetProps) {
	return (
		<article
			data-bento-preset="landscape"
			style={{
				borderRadius: getBentoItemRadius("link", "landscape"),
				backgroundColor,
			}}
			className={`relative flex size-full min-h-0 items-center gap-3 overflow-hidden bg-white p-3 ${imageUrl ? "surface-line outline-depth" : ""}`}
		>
			<SpotifyFeaturedArtwork
				spotifyUrl={spotifyUrl}
				imageUrl={imageUrl}
				heading={heading}
				textColor={textColor}
				brandColor={brightAccentColor ?? "#1ED760"}
				gradientColor={backgroundColor}
				playback={playback}
				className="aspect-square h-full shrink-0"
			/>
			<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
				<SpotifyTrackList
					tracks={tracks}
					playback={playback}
					textColor={textColor}
					subduedTextColor={subduedTextColor}
					brightAccentColor={brightAccentColor}
					backgroundTintedColor={backgroundTintedColor}
				/>
			</div>
		</article>
	);
}

function SpotifyPortrait({
	spotifyUrl,
	imageUrl,
	heading,
	textColor,
	subduedTextColor,
	brightAccentColor,
	backgroundColor,
	backgroundTintedColor,
	tracks,
	playback,
}: SpotifyWidgetProps) {
	return (
		<article
			data-bento-preset="portrait"
			style={{
				borderRadius: getBentoItemRadius("link", "portrait"),
				backgroundColor,
			}}
			className={`relative flex size-full min-h-0 flex-col gap-3 overflow-hidden bg-white p-3 ${imageUrl ? "surface-line outline-depth" : ""}`}
		>
			<SpotifyFeaturedArtwork
				spotifyUrl={spotifyUrl}
				imageUrl={imageUrl}
				heading={heading}
				textColor={textColor}
				brandColor={brightAccentColor ?? "#1ED760"}
				gradientColor={backgroundColor}
				playback={playback}
				className="aspect-square w-full shrink-0"
			/>
			<SpotifyTrackList
				tracks={tracks}
				playback={playback}
				textColor={textColor}
				subduedTextColor={subduedTextColor}
				brightAccentColor={brightAccentColor}
				backgroundTintedColor={backgroundTintedColor}
			/>
		</article>
	);
}

function SpotifySquareLarge({
	spotifyUrl,
	imageUrl,
	heading,
	textColor,
	subduedTextColor,
	brightAccentColor,
	backgroundColor,
	backgroundTintedColor,
	tracks,
	playback,
}: SpotifyWidgetProps) {
	return (
		<article
			data-bento-preset="squareLarge"
			style={{
				borderRadius: getBentoItemRadius("link", "squareLarge"),
				backgroundColor,
			}}
			className={`relative flex size-full min-h-0 flex-col gap-3 overflow-hidden bg-white p-3 ${imageUrl ? "surface-line outline-depth" : ""}`}
		>
			<SpotifyFeaturedArtwork
				spotifyUrl={spotifyUrl}
				imageUrl={imageUrl}
				heading={heading}
				textColor={textColor}
				brandColor={brightAccentColor ?? "#1ED760"}
				gradientColor={backgroundColor}
				playback={playback}
				className="h-1/2 w-full shrink-0"
			/>
			<SpotifyTrackList
				tracks={tracks}
				playback={playback}
				textColor={textColor}
				subduedTextColor={subduedTextColor}
				brightAccentColor={brightAccentColor}
				backgroundTintedColor={backgroundTintedColor}
			/>
		</article>
	);
}

const spotifyPresetWidgets: Record<
	SpotifyPreset,
	ComponentType<SpotifyWidgetProps>
> = {
	squareSmall: SpotifySquareSmall,
	halfBanner: SpotifyHalfBanner,
	landscape: SpotifyLandscape,
	portrait: SpotifyPortrait,
	squareLarge: SpotifySquareLarge,
};

export default function SpotifyWidget({
	item,
	preset,
}: {
	item: SpotifyLinkItem;
	preset: PresetName | null;
}) {
	const metadata = item.data.metadata;
	const spotify = metadata?.providerData?.spotify;
	const title = metadata?.title ?? spotify?.track ?? "Spotify";
	const heading = title;
	const tracks = spotify?.tracks ?? [];
	const { currentTrackIndex, isPlaying, progress, playTrack, togglePlayback } =
		useSpotifyPlayer(tracks);
	const playback: SpotifyPlaybackState = {
		canPlay: tracks.some((track) => Boolean(track.previewUrl)),
		currentTrackIndex,
		isPlaying,
		progress,
		playTrack,
		togglePlayback,
	};
	const widgetPreset = preset === "fullBanner" ? "squareSmall" : preset;
	const PresetWidget = spotifyPresetWidgets[widgetPreset ?? "squareSmall"];

	return (
		<PresetWidget
			spotifyUrl={item.data.url}
			imageUrl={metadata?.imageUrl}
			heading={heading}
			artist={spotify?.artist}
			type={spotify?.type}
			tracks={tracks}
			textColor={spotifyColorToHex(spotify?.visualIdentity?.textBase)}
			subduedTextColor={spotifyColorToHex(spotify?.visualIdentity?.textSubdued)}
			brightAccentColor={spotifyColorToHex(
				spotify?.visualIdentity?.textBrightAccent,
			)}
			backgroundColor={spotifyColorToHex(
				spotify?.visualIdentity?.backgroundBase,
			)}
			backgroundTintedColor={spotifyColorToHex(
				spotify?.visualIdentity?.backgroundTintedBase,
			)}
			playback={playback}
		/>
	);
}

export { SpotifyWidget };
