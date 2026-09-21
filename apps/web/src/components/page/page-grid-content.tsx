"use client";

import type { PageItemResponse } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import type { PresetName } from "@grabbin/grid-layout";
import { buttonVariants } from "@grabbin/ui/components/button";
import { type ReactNode, useEffect, useRef, useState } from "react";
import MapboxMap from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { CircleArrowRightUp } from "reicon-react";
import { MAPBOX_STYLE_CONFIG, MAPBOX_STYLE_URL } from "@/lib/map-config";
import { LinkItem } from "./page-grid-link";

const mapboxLib = import("mapbox-gl").then((module) => {
	if (typeof window !== "undefined") module.default.prewarm();
	return module;
});

function removeMapboxControls(map: { getContainer(): HTMLElement }) {
	map
		.getContainer()
		.querySelectorAll(
			".mapboxgl-ctrl, .mapboxgl-ctrl-icon, .mapboxgl-ctrl-logo",
		)
		.forEach((control) => {
			control.remove();
		});
}

const textSizeClassByPreset: Record<PresetName, string> = {
	fullBanner: "text-lg font-medium leading-7",
	halfBanner: "text-lg font-medium leading-8.5",
	squareSmall: "text-lg font-medium leading-7",
	landscape: "text-lg font-medium leading-7",
	squareLarge: "text-lg font-medium leading-8",
	portrait: "text-lg font-medium leading-8",
};

function ExternalAction({ href, label }: { href: string; label: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			className="group inline-flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-full bg-white/60 font-medium text-white text-xs transition-colors hover:bg-white"
		>
			<CircleArrowRightUp
				aria-hidden="true"
				size={28}
				weight="Filled"
				className="text-black/60! group-hover:text-black!"
			/>
		</a>
	);
}

function MediaCaption({ value }: { value: string | undefined }) {
	const caption = value?.trim();
	return caption ? (
		<p className="field-sizing-content flex h-7.5 w-fit min-w-0 max-w-full items-center rounded-md border border-border bg-white/80 px-2 py-0 font-medium text-foreground text-sm backdrop-blur-sm">
			<span className="block min-w-0 flex-1 truncate">{caption}</span>
		</p>
	) : null;
}

function MapViewportGate({
	children,
	placeholder,
}: {
	children: ReactNode;
	placeholder: ReactNode;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		if (hasMounted) return;
		const container = containerRef.current;
		if (!container || typeof IntersectionObserver === "undefined") {
			setHasMounted(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) setHasMounted(true);
			},
			{ rootMargin: "200px 0px" },
		);
		observer.observe(container);
		return () => observer.disconnect();
	}, [hasMounted]);

	return (
		<div ref={containerRef} className="relative size-full min-h-0">
			{hasMounted ? children : placeholder}
		</div>
	);
}

function TextItem({
	item,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "text" }>;
	preset: PresetName;
}) {
	const verticalAlignClass = {
		bottom: "justify-end",
		center: "justify-center",
		top: "justify-start",
	}[item.style.verticalAlign ?? "top"];
	return (
		<div className="relative flex size-full min-h-0 flex-col gap-3 p-3">
			<div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
				<div
					className={`flex min-h-0 min-w-0 flex-1 flex-col ${verticalAlignClass}`}
				>
					<div
						className={`no-scrollbar min-h-0 min-w-0 flex-1 rounded-lg bg-transparent p-1 px-2 text-foreground/90 outline-none ${textSizeClassByPreset[preset]} overflow-y-auto whitespace-pre-wrap`}
						style={{ textAlign: item.style.textAlign ?? "left" }}
					>
						{item.data.text}
					</div>
				</div>
			</div>
			{item.data.link ? (
				<div className="absolute right-4 bottom-4 flex h-fit items-center">
					<ExternalAction href={item.data.link} label="Open text link" />
				</div>
			) : null}
		</div>
	);
}

function MediaItem({
	item,
	preset,
}: {
	item: Extract<PageItemResponse, { type: "media" }>;
	preset: PresetName;
}) {
	const isVideo = item.data.mimeType.startsWith("video/");
	const [mediaReady, setMediaReady] = useState(false);
	return (
		<div
			data-media-frame="true"
			data-media-preset={preset}
			className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30 ${mediaReady && !item.data.mediaUrl?.startsWith("data:") ? "surface-line" : ""}`}
		>
			{item.data.mediaUrl ? (
				isVideo ? (
					<video
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						src={item.data.mediaUrl}
						onLoadedMetadata={() => setMediaReady(true)}
						className="pointer-events-none absolute inset-0 size-full object-cover"
					/>
				) : (
					<img
						alt={item.data.caption ?? "Media item"}
						className="pointer-events-none absolute inset-0 size-full object-cover"
						decoding="async"
						fetchPriority="low"
						loading="lazy"
						src={item.data.mediaUrl}
						onLoad={() => setMediaReady(true)}
					/>
				)
			) : null}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption value={item.data.caption} />
				{item.data.link ? (
					<div className="pointer-events-auto flex h-fit shrink-0 items-center">
						<ExternalAction href={item.data.link} label="Open media" />
					</div>
				) : null}
			</div>
		</div>
	);
}

function MapItem({
	item,
}: {
	item: Extract<PageItemResponse, { type: "map" }>;
}) {
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.data.latitude},${item.data.longitude}`;
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
	const [mapError, setMapError] = useState(false);
	const [mapReady, setMapReady] = useState(false);
	const [mapRevision, setMapRevision] = useState(0);
	const showMapFallback = !accessToken || mapError;
	return (
		<div
			className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30 ${mapReady && !mapError ? "surface-line" : ""}`}
		>
			<div className="absolute inset-0">
				{showMapFallback ? (
					<div className="flex size-full min-h-0 items-center justify-center bg-muted/30 p-4 text-center">
						<div className="flex max-w-xs flex-col items-center gap-3">
							<div className="space-y-1">
								<p className="font-semibold text-foreground text-sm">
									Map unavailable
								</p>
								<p className="text-muted-foreground text-sm tabular-nums">
									{item.data.latitude.toFixed(5)},{" "}
									{item.data.longitude.toFixed(5)}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									className={buttonVariants({
										variant: "outline",
										size: "sm",
										className:
											"h-8 rounded-4xl text-sm! shadow-none transition-all duration-150 ease-in-out focus-visible:ring-ring/30",
									})}
									style={{ boxShadow: "none" }}
									onClick={() => {
										setMapError(false);
										setMapReady(false);
										setMapRevision((revision) => revision + 1);
									}}
								>
									Retry
								</button>
								<ExternalAction href={mapsUrl} label="Open Google Maps" />
							</div>
						</div>
					</div>
				) : (
					<div className="pointer-events-none absolute inset-0">
						<MapViewportGate
							placeholder={
								<div
									aria-hidden="true"
									className="size-full min-h-0 bg-muted/30"
								/>
							}
						>
							<div className="relative size-full min-h-0">
								<MapboxMap
									key={mapRevision}
									mapLib={mapboxLib}
									{...({ config: MAPBOX_STYLE_CONFIG } as const)}
									mapboxAccessToken={accessToken}
									mapStyle={MAPBOX_STYLE_URL}
									initialViewState={{
										latitude: item.data.latitude,
										longitude: item.data.longitude,
										zoom: item.data.zoom ?? 12,
									}}
									attributionControl={false}
									interactive={false}
									projection="mercator"
									pitch={0}
									maxPitch={0}
									bearing={0}
									dragRotate={false}
									touchPitch={false}
									minZoom={0}
									maxZoom={22}
									style={{ height: "100%", width: "100%" }}
									onLoad={(event) => {
										removeMapboxControls(event.target);
										setMapReady(true);
									}}
									onError={() => setMapError(true)}
								/>
							</div>
						</MapViewportGate>
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
						>
							<span className="animation-duration-[2.5s] absolute size-12 animate-ping rounded-full bg-brand/35" />
							<span className="beautiful-shadow smooth-ring-neutral-300/40! relative size-7 rounded-full bg-white p-1 drop-shadow-lg">
								<span className="block size-full rounded-full bg-brand" />
							</span>
						</div>
					</div>
				)}
			</div>
			<div className="pointer-events-none relative size-full" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption value={item.data.caption} />
			</div>
		</div>
	);
}

function SectionItem({
	item,
}: {
	item: Extract<PageItemResponse, { type: "section" }>;
}) {
	return (
		<div className="flex size-full items-center overflow-hidden p-3">
			<p className="line-clamp-1 w-full min-w-0 truncate px-2 font-semibold text-xl leading-11">
				{item.data.title}
			</p>
		</div>
	);
}

export function RuntimeFallback({ item }: { item: PageItemResponse }) {
	return (
		<div className="flex size-full items-center justify-center px-4 text-center text-muted-foreground text-sm">
			Unsupported {item.type} item
		</div>
	);
}

export function renderItem(item: PageItemResponse, preset: PresetName) {
	switch (item.type) {
		case "text":
			return <TextItem item={item} preset={preset} />;
		case "media":
			return <MediaItem item={item} preset={preset} />;
		case "map":
			return <MapItem item={item} />;
		case "section":
			return <SectionItem item={item} />;
		case "link":
			return <LinkItem item={item} preset={preset} />;
	}
}
