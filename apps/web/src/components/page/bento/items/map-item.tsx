"use client";

import { env } from "@grabbin/env/web";
import { buttonVariants } from "@grabbin/ui/components/button";
import { MoveIcon } from "lucide-react";
import MapboxMap from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { MAPBOX_STYLE_CONFIG, MAPBOX_STYLE_URL } from "@/lib/map-config";
import {
	ExternalAction,
	MapViewportGate,
	MediaCaption,
	mapboxLib,
	removeMapboxControls,
} from "./shared";

export function MapItem({
	item,
	mode,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "map" }>;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.data.latitude},${item.data.longitude}`;
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
	const [mapError, setMapError] = useState(false);
	const [mapReady, setMapReady] = useState(false);
	const [mapRevision, setMapRevision] = useState(0);
	const [isLocationEditing, setIsLocationEditing] = useState(false);
	const interactive = mode === "edit" && isLocationEditing;
	useEffect(() => {
		if (mode !== "edit") setIsLocationEditing(false);
	}, [mode]);
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
					<div
						className={`absolute inset-0 ${interactive ? "" : "pointer-events-none"}`}
					>
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
									interactive={interactive}
									projection="mercator"
									pitch={0}
									maxPitch={0}
									bearing={0}
									dragRotate={false}
									touchPitch={false}
									minZoom={0}
									maxZoom={22}
									style={{ height: "100%", width: "100%" }}
									onMoveEnd={(event) => {
										if (!interactive || !onCommand) return;
										onCommand({
											type: "update-data",
											itemId: item.id,
											data: {
												...item.data,
												latitude: event.viewState.latitude,
												longitude: event.viewState.longitude,
												zoom: event.viewState.zoom,
											},
										});
									}}
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
			{mode === "edit" && !showMapFallback ? (
				<button
					type="button"
					data-bento-item-drag-cancel="true"
					aria-label={
						isLocationEditing ? "Stop editing location" : "Edit location"
					}
					aria-pressed={isLocationEditing}
					className={`absolute top-3 right-3 z-20 inline-flex size-8 items-center justify-center rounded-lg bg-black/70 text-white shadow-lg transition-colors hover:bg-black ${isLocationEditing ? "bg-brand hover:bg-brand" : ""}`}
					onClick={() => setIsLocationEditing((current) => !current)}
				>
					<MoveIcon className="size-4" aria-hidden="true" />
				</button>
			) : null}
			<div className="pointer-events-none relative size-full" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
				<MediaCaption value={item.data.caption} />
			</div>
		</div>
	);
}
