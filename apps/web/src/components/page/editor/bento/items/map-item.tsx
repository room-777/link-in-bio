"use client";

import "@grabbin/ui/styles/map-widget.css";

import { getBentoItemRadius, type PresetName } from "@grabbin/bento-layout";
import { env } from "@grabbin/env/web";
import { buttonVariants } from "@grabbin/ui/components/button";
import MapboxMap, {
	GeolocateControl,
	type GeolocateControlInstance,
	type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import {
	MAP_ZOOM_MAX,
	MAP_ZOOM_MIN,
	MAPBOX_STYLE_CONFIG,
	MAPBOX_STYLE_URL,
	normalizeMapCamera,
	sanitizeMapCamera,
} from "@/lib/map-config";
import type { MapSearchResult } from "@/lib/mapbox-geocoding";
import { useMapItemInteraction } from "./map-item-interaction-context";
import {
	ExternalAction,
	MapViewportGate,
	MediaCaption,
	removeMapboxControls,
} from "./shared";

type MapboxInteractionHandler = {
	disable(): void;
	enable(): void;
};

type MapboxMapWithHandlers = {
	dragPan?: MapboxInteractionHandler;
	scrollZoom?: MapboxInteractionHandler;
	boxZoom?: MapboxInteractionHandler;
	doubleClickZoom?: MapboxInteractionHandler;
	keyboard?: MapboxInteractionHandler;
	touchZoomRotate?: MapboxInteractionHandler & {
		disableRotation(): void;
	};
};

type MapMoveSource = "user" | "ignore" | "persist";

type MapMountRequest = {
	cancelled: boolean;
	start: () => void;
};

type MapMountLease = {
	cancel(): void;
	prioritize(): void;
	release(): void;
};

const pendingMapMounts: MapMountRequest[] = [];
let activeMapMount: MapMountRequest | null = null;
let mapMountDrainFrame: number | null = null;
let mapMountDrainTimer: number | null = null;
let lastMapScrollAt = Number.NEGATIVE_INFINITY;
let mapScrollTrackingStarted = false;
let mapboxLibPromise: Promise<typeof import("mapbox-gl")> | null = null;
const MAP_MOUNT_SCROLL_IDLE_DELAY = 160;

function cancelMapMountDrain() {
	if (mapMountDrainFrame !== null) {
		window.cancelAnimationFrame(mapMountDrainFrame);
		mapMountDrainFrame = null;
	}
	if (mapMountDrainTimer !== null) {
		window.clearTimeout(mapMountDrainTimer);
		mapMountDrainTimer = null;
	}
}

function scheduleMapMountDrain() {
	if (
		activeMapMount ||
		pendingMapMounts.length === 0 ||
		mapMountDrainFrame !== null ||
		mapMountDrainTimer !== null
	)
		return;

	const remainingScrollTime =
		MAP_MOUNT_SCROLL_IDLE_DELAY - (Date.now() - lastMapScrollAt);
	if (remainingScrollTime > 0) {
		mapMountDrainTimer = window.setTimeout(() => {
			mapMountDrainTimer = null;
			scheduleMapMountDrain();
		}, remainingScrollTime);
		return;
	}

	const drain = () => {
		mapMountDrainFrame = null;
		const remainingScrollTime =
			MAP_MOUNT_SCROLL_IDLE_DELAY - (Date.now() - lastMapScrollAt);
		if (remainingScrollTime > 0) {
			scheduleMapMountDrain();
			return;
		}
		while (pendingMapMounts[0]?.cancelled) pendingMapMounts.shift();
		const next = pendingMapMounts.shift();
		if (!next) return;
		activeMapMount = next;
		next.start();
	};
	mapMountDrainFrame = window.requestAnimationFrame
		? window.requestAnimationFrame(drain)
		: window.setTimeout(drain, 0);
}

function handleMapScroll() {
	lastMapScrollAt = Date.now();
	cancelMapMountDrain();
	scheduleMapMountDrain();
}

function startMapScrollTracking() {
	if (mapScrollTrackingStarted) return;
	mapScrollTrackingStarted = true;
	window.addEventListener("scroll", handleMapScroll, {
		capture: true,
		passive: true,
	});
}

function enqueueMapMount(start: () => void, priority: boolean): MapMountLease {
	const request: MapMountRequest = { cancelled: false, start };
	if (priority) pendingMapMounts.unshift(request);
	else pendingMapMounts.push(request);
	startMapScrollTracking();
	scheduleMapMountDrain();

	const release = () => {
		if (activeMapMount !== request) return;
		activeMapMount = null;
		scheduleMapMountDrain();
	};
	return {
		cancel: () => {
			request.cancelled = true;
			release();
			scheduleMapMountDrain();
		},
		prioritize: () => {
			if (request.cancelled || activeMapMount === request) return;
			const requestIndex = pendingMapMounts.indexOf(request);
			if (requestIndex <= 0) return;
			pendingMapMounts.splice(requestIndex, 1);
			pendingMapMounts.unshift(request);
		},
		release,
	};
}

function loadMapboxLib() {
	if (mapboxLibPromise) return mapboxLibPromise;
	mapboxLibPromise = import("mapbox-gl").then((module) => {
		module.default.prewarm();
		return module;
	});
	return mapboxLibPromise;
}

function DeferredMapboxMap({
	children,
	priority = false,
}: {
	children: (
		mapLib: Promise<typeof import("mapbox-gl")>,
		releaseMapMount: () => void,
	) => ReactNode;
	priority?: boolean;
}) {
	const [isMountAllowed, setIsMountAllowed] = useState(false);
	const leaseRef = useRef<MapMountLease | null>(null);
	const initialPriority = useRef(priority).current;
	useEffect(() => {
		const lease = enqueueMapMount(
			() => setIsMountAllowed(true),
			initialPriority,
		);
		leaseRef.current = lease;
		return () => {
			lease.cancel();
			leaseRef.current = null;
		};
	}, [initialPriority]);
	useEffect(() => {
		if (priority) leaseRef.current?.prioritize();
	}, [priority]);
	const mapLib = useMemo(
		() => (isMountAllowed ? loadMapboxLib() : null),
		[isMountAllowed],
	);
	if (!mapLib) return null;
	return children(mapLib, () => leaseRef.current?.release());
}

function setMapInteractions(map: MapboxMapWithHandlers, enabled: boolean) {
	for (const handler of [
		map.dragPan,
		map.scrollZoom,
		map.boxZoom,
		map.doubleClickZoom,
		map.keyboard,
		map.touchZoomRotate,
	]) {
		if (enabled) handler?.enable();
		else handler?.disable();
	}
	map.touchZoomRotate?.disableRotation();
}

export function MapItem({
	item,
	preset,
	mode,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "map" }>;
	preset: PresetName;
	mode: "view" | "edit";
	onCommand?: (command: BentoCommand) => void;
}) {
	const {
		isLocationEditing,
		disableLocationSearch,
		setLocationEditing,
		registerController,
	} = useMapItemInteraction();
	const mapsUrl = `https://www.google.com/maps?q=${item.data.latitude.toFixed(6)},${item.data.longitude.toFixed(6)}`;
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
	const [mapError, setMapError] = useState(false);
	const [mapRevision, setMapRevision] = useState(0);
	const [mapReady, setMapReady] = useState(false);
	const [geolocationError, setGeolocationError] = useState(false);
	const mapFrameRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapRef>(null);
	const geolocateRef = useRef<GeolocateControlInstance>(null);
	const mapLoadedRef = useRef(false);
	const mapInteractionsSuspendedRef = useRef(false);
	const mapMoveSourceRef = useRef<MapMoveSource | null>(null);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isContainerSized, setIsContainerSized] = useState(false);
	const interactive = mode === "edit" && isLocationEditing;
	const showMapFallback = !accessToken || mapError;
	const camera = normalizeMapCamera(item.data);
	useEffect(() => {
		const releaseMapInteractions = () => {
			if (!mapInteractionsSuspendedRef.current) return;
			const map = mapRef.current?.getMap() as MapboxMapWithHandlers | undefined;
			if (map) setMapInteractions(map, interactive);
			mapInteractionsSuspendedRef.current = false;
		};

		window.addEventListener("mouseup", releaseMapInteractions, true);
		window.addEventListener("pointerup", releaseMapInteractions, true);
		window.addEventListener("pointercancel", releaseMapInteractions, true);
		window.addEventListener("blur", releaseMapInteractions);
		return () => {
			window.removeEventListener("mouseup", releaseMapInteractions, true);
			window.removeEventListener("pointerup", releaseMapInteractions, true);
			window.removeEventListener("pointercancel", releaseMapInteractions, true);
			window.removeEventListener("blur", releaseMapInteractions);
			releaseMapInteractions();
		};
	}, [interactive]);
	const handleGridDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!interactive || !(event.target instanceof Element)) return;
		if (
			event.target.closest(
				"a,button,input,textarea,select,video,[contenteditable='true'],[data-bento-item-drag-cancel='true']",
			)
		)
			return;
		const map = mapRef.current?.getMap() as MapboxMapWithHandlers | undefined;
		if (!map) return;
		setMapInteractions(map, false);
		mapInteractionsSuspendedRef.current = true;
	};
	useEffect(() => {
		registerController({
			zoomIn: () => {
				const map = mapRef.current?.getMap();
				if (!map) return;
				mapMoveSourceRef.current = "persist";
				map.zoomIn();
			},
			zoomOut: () => {
				const map = mapRef.current?.getMap();
				if (!map) return;
				mapMoveSourceRef.current = "persist";
				map.zoomOut();
			},
			locate: () => {
				mapMoveSourceRef.current = "ignore";
				geolocateRef.current?.trigger();
			},
			selectLocation: (result: MapSearchResult) => {
				if (disableLocationSearch || !onCommand) return;
				setGeolocationError(false);
				mapMoveSourceRef.current = "ignore";
				const nextData = {
					...item.data,
					latitude: result.latitude,
					longitude: result.longitude,
					caption: item.data.caption?.trim() ? item.data.caption : result.name,
				};
				onCommand({ type: "update-data", itemId: item.id, data: nextData });
				mapRef.current?.getMap().flyTo({
					center: [result.longitude, result.latitude],
					zoom: nextData.zoom ?? 12,
					duration: 450,
				});
			},
		});
		return () => registerController(null);
	}, [
		disableLocationSearch,
		item.data,
		item.id,
		onCommand,
		registerController,
	]);
	useEffect(() => {
		if (mode !== "edit") setLocationEditing(false);
	}, [mode, setLocationEditing]);
	useEffect(() => {
		const container = mapFrameRef.current;
		if (!container) return;
		if (typeof ResizeObserver === "undefined") {
			setIsContainerSized(true);
			return;
		}
		const updateSize = (width: number, height: number) => {
			setIsContainerSized(width > 0 && height > 0);
		};
		const initialRect = container.getBoundingClientRect();
		updateSize(initialRect.width, initialRect.height);
		const observer = new ResizeObserver(([entry]) => {
			const width = entry?.contentRect.width ?? 0;
			const height = entry?.contentRect.height ?? 0;
			updateSize(width, height);
			if (width <= 0 || height <= 0) return;
			if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
			resizeTimeoutRef.current = setTimeout(() => {
				resizeTimeoutRef.current = null;
				mapRef.current?.resize();
			}, 120);
		});
		observer.observe(container);
		return () => {
			observer.disconnect();
			if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
			resizeTimeoutRef.current = null;
		};
	}, []);
	const frameRadius = getBentoItemRadius(item.type, preset);

	return (
		<div
			ref={mapFrameRef}
			style={{ borderRadius: frameRadius }}
			onPointerDownCapture={handleGridDragStart}
			className={`relative size-full overflow-hidden rounded-[inherit] bg-secondary outline-depth ${interactive ? "grid-action cursor-grab" : ""}`}
			data-bento-map-location-editing={interactive ? "true" : undefined}
		>
			<div className="absolute inset-0">
				{showMapFallback ? (
					<div className="flex size-full min-h-0 items-center justify-center bg-secondary p-4 text-center">
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
										mapLoadedRef.current = false;
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
							forceMount={interactive}
							placeholder={
								<div
									aria-hidden="true"
									className="size-full min-h-0 bg-secondary"
								/>
							}
						>
							<div
								className="relative size-full min-h-0"
								data-bento-item-drag-cancel={interactive ? "true" : undefined}
							>
								{isContainerSized ? (
									<DeferredMapboxMap priority={interactive}>
										{(mapLib, releaseMapMount) => (
											<MapboxMap
												key={mapRevision}
												ref={mapRef}
												mapLib={mapLib}
												{...({ config: MAPBOX_STYLE_CONFIG } as const)}
												mapboxAccessToken={accessToken}
												mapStyle={MAPBOX_STYLE_URL}
												initialViewState={{
													latitude: camera.latitude,
													longitude: camera.longitude,
													zoom: camera.zoom,
												}}
												attributionControl={false}
												interactive={interactive}
												dragPan={interactive}
												scrollZoom={interactive}
												boxZoom={interactive}
												doubleClickZoom={interactive}
												keyboard={interactive}
												touchZoomRotate={interactive}
												projection="mercator"
												pitch={0}
												maxPitch={0}
												bearing={0}
												dragRotate={false}
												touchPitch={false}
												minZoom={MAP_ZOOM_MIN}
												maxZoom={MAP_ZOOM_MAX}
												style={{ height: "100%", width: "100%" }}
												onMoveStart={(event) => {
													if ("originalEvent" in event && event.originalEvent) {
														mapMoveSourceRef.current = "user";
													} else if (mapMoveSourceRef.current === null) {
														mapMoveSourceRef.current = "ignore";
													}
												}}
												onMoveEnd={(event) => {
													const moveSource = mapMoveSourceRef.current;
													mapMoveSourceRef.current = null;
													if (
														!interactive ||
														!onCommand ||
														(moveSource !== "user" && moveSource !== "persist")
													)
														return;
													const nextCamera = sanitizeMapCamera(event.viewState);
													if (!nextCamera) return;
													setGeolocationError(false);
													onCommand({
														type: "update-data",
														itemId: item.id,
														data: {
															...item.data,
															latitude: nextCamera.latitude,
															longitude: nextCamera.longitude,
															zoom: nextCamera.zoom,
														},
													});
												}}
												onLoad={(event) => {
													removeMapboxControls(event.target);
													window.requestAnimationFrame(() =>
														removeMapboxControls(event.target),
													);
													setMapInteractions(
														event.target as MapboxMapWithHandlers,
														interactive,
													);
													mapLoadedRef.current = true;
													setMapReady(true);
													releaseMapMount();
												}}
												onError={() => {
													if (mapLoadedRef.current) return;
													releaseMapMount();
													setMapReady(false);
													setMapError(true);
												}}
											>
												{interactive ? (
													<GeolocateControl
														ref={geolocateRef}
														position="top-right"
														showButton={false}
														showUserLocation={false}
														showAccuracyCircle={false}
														trackUserLocation={false}
														onGeolocate={(event) => {
															if (!onCommand) return;
															setGeolocationError(false);
															onCommand({
																type: "update-data",
																itemId: item.id,
																data: {
																	...item.data,
																	latitude: event.coords.latitude,
																	longitude: event.coords.longitude,
																	zoom:
																		mapRef.current?.getZoom() ?? camera.zoom,
																},
															});
														}}
														onError={() => setGeolocationError(true)}
													/>
												) : null}
											</MapboxMap>
										)}
									</DeferredMapboxMap>
								) : null}
							</div>
						</MapViewportGate>
						{mapReady ? (
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
					</div>
				)}
			</div>
			{geolocationError ? (
				<output
					aria-live="polite"
					className="pointer-events-auto absolute inset-x-0 top-4 z-20 mx-4 rounded-full bg-background/90 px-3 py-1 text-center font-medium text-destructive text-xs shadow-sm"
				>
					Couldn’t determine your location. Try again.
				</output>
			) : null}
			<div className="pointer-events-none absolute right-3 bottom-4 left-4 z-20 flex min-w-0 items-center justify-between gap-3 text-white">
				<MediaCaption
					value={item.data.caption}
					mode={mode}
					className="max-w-[calc(100%-2.5rem)]"
					onChange={(caption) =>
						onCommand?.({
							type: "update-data",
							itemId: item.id,
							data: { ...item.data, caption: caption.trim() || undefined },
						})
					}
				/>
				<div className="pointer-events-auto flex h-fit shrink-0 items-center">
					<ExternalAction href={mapsUrl} label="Open location in Google Maps" />
				</div>
			</div>
		</div>
	);
}
