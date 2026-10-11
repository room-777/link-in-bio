"use client";

import type { ErrorEvent, Map as MapboxMapInstance, MapEvent } from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapboxMap, type MapRef, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@grabbin/env/web";
import { useReducedMotion } from "motion/react";
import { removeMapboxControls } from "@/components/page/editor/bento/items/shared";
import { MAPBOX_STYLE_URL } from "@/lib/map-config";

const ROTATION_STEP = 6;
const ROTATION_SPEED = 0.002;
const ROTATION_DURATION = ROTATION_STEP / ROTATION_SPEED;
const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";
const MOBILE_BASE_ZOOM = 0.3;
const MOBILE_BASE_MAP_WIDTH = 213;

const getMobileZoom = (map: MapboxMapInstance) =>
	MOBILE_BASE_ZOOM +
	Math.log2(map.getContainer().clientWidth / MOBILE_BASE_MAP_WIDTH);

const MARKERS = [
	{ id: "01", longitude: -154, latitude: 34, color: "#f2b84b" },
	{ id: "02", longitude: -123, latitude: -6, color: "#6c8ef5" },
	{ id: "03", longitude: -91, latitude: 27, color: "#e9857a" },
	{ id: "04", longitude: -58, latitude: -31, color: "#9c83eb" },
	{ id: "05", longitude: -19, latitude: 42, color: "#62c2a6" },
	{ id: "06", longitude: 17, latitude: 7, color: "#f2825e" },
	{ id: "07", longitude: 43, latitude: 39, color: "#e4a6d4" },
	{ id: "08", longitude: 75, latitude: 20, color: "#f0c45e" },
	{ id: "09", longitude: 111, latitude: 45, color: "#71b5e8" },
	{ id: "10", longitude: 139, latitude: -22, color: "#e47f91" },
	{ id: "11", longitude: 171, latitude: 18, color: "#8fc88a" },
	{ id: "12", longitude: -36, latitude: 6, color: "#b38ce6" },
	{ id: "13", longitude: -166, latitude: 58, color: "#f09b72" },
	{ id: "14", longitude: -141, latitude: 71, color: "#7f9cf5" },
	{ id: "15", longitude: -112, latitude: 53, color: "#d88bd0" },
	{ id: "16", longitude: -79, latitude: 67, color: "#70c6ac" },
	{ id: "17", longitude: -46, latitude: 55, color: "#efc05f" },
	{ id: "18", longitude: -12, latitude: 73, color: "#8bb9e8" },
	{ id: "19", longitude: 20, latitude: 61, color: "#e9868e" },
	{ id: "20", longitude: 51, latitude: 68, color: "#a58de8" },
	{ id: "21", longitude: 84, latitude: 55, color: "#f1ab64" },
	{ id: "22", longitude: 117, latitude: 70, color: "#78c391" },
] as const;

const avatarUrl = (seed: string) =>
	`https://api.dicebear.com/10.x/notionists/svg?seed=foundly-${seed}&size=100&radius=50`;

export default function LandingCtaGlobe() {
	const mapRef = useRef<MapRef>(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [hasMapError, setHasMapError] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

	const handleLoad = useCallback((event: MapEvent) => {
		const map = event.target;
		removeMapboxControls(map);
		map.setPadding({ top: 64 });
		map.scrollZoom.disable();
		map.boxZoom.disable();
		map.dragPan.disable();
		map.dragRotate.disable();
		map.keyboard.disable();
		map.doubleClickZoom.disable();
		map.touchZoomRotate.disable();
		map.touchPitch.disable();
		if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
			map.jumpTo({ center: [12, 60], zoom: getMobileZoom(map) });
		}
		map.setFog({
			color: "rgba(0, 0, 0, 0)",
			"high-color": "rgba(0, 0, 0, 0)",
			"space-color": "rgba(0, 0, 0, 0)",
			"horizon-blend": 0.02,
			"star-intensity": 0,
		});
		map.once("idle", () => {
			removeMapboxControls(map);
			setIsMapReady(true);
		});
	}, []);

	const handleError = useCallback((_event: ErrorEvent) => {
		setHasMapError(true);
	}, []);

	useEffect(() => {
		if (!isMapReady || shouldReduceMotion) return;

		const map = mapRef.current?.getMap();
		if (!map) return;

		let isActive = true;
		const rotate = () => {
			if (!isActive || document.visibilityState !== "visible") return;
			const center = map.getCenter();
			map.easeTo({
				center: [center.lng - ROTATION_STEP, center.lat],
				duration: ROTATION_DURATION,
				easing: (progress) => progress,
				essential: true,
			});
		};
		const handleMoveEnd = () => rotate();
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				map.stop();
				return;
			}
			rotate();
		};

		map.on("moveend", handleMoveEnd);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		rotate();

		return () => {
			isActive = false;
			map.off("moveend", handleMoveEnd);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			map.stop();
		};
	}, [isMapReady, shouldReduceMotion]);

	useEffect(() => {
		if (!isMapReady) return;

		const map = mapRef.current?.getMap();
		if (!map) return;

		const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
		const updateCamera = () => {
			const center = map.getCenter();
			const isMobile = mediaQuery.matches;
			map.jumpTo({
				center: [center.lng, isMobile ? 60 : 18],
				zoom: isMobile ? getMobileZoom(map) : 1.8,
			});
		};
		updateCamera();
		mediaQuery.addEventListener("change", updateCamera);
		const resizeObserver = new ResizeObserver(() => {
			if (mediaQuery.matches) updateCamera();
		});
		resizeObserver.observe(map.getContainer());

		return () => {
			mediaQuery.removeEventListener("change", updateCamera);
			resizeObserver.disconnect();
		};
	}, [isMapReady]);

	if (!accessToken || hasMapError) return null;

	return (
		<div
			className="relative aspect-[50/23] w-full overflow-hidden pt-12 [box-sizing:content-box] [mask-image:linear-gradient(to_bottom,black_64%,transparent_100%)] lg:aspect-[3/1] lg:[box-sizing:border-box] lg:[mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)]"
			aria-label="Decorative rotating globe"
			role="img"
		>
			<div className="absolute top-12 left-1/2 aspect-square w-[92%] -translate-x-1/2 lg:aspect-[3/2] lg:w-full">
				<MapboxMap
					ref={mapRef}
					mapboxAccessToken={accessToken}
					mapStyle={MAPBOX_STYLE_URL}
					projection="globe"
					initialViewState={{ longitude: 12, latitude: 18, zoom: 1.8 }}
					interactive={false}
					scrollZoom={false}
					boxZoom={false}
					dragPan={false}
					dragRotate={false}
					keyboard={false}
					doubleClickZoom={false}
					touchZoomRotate={false}
					touchPitch={false}
					attributionControl={false}
					logoPosition="top-left"
					style={{
						width: "100%",
						height: "100%",
						opacity: isMapReady ? 1 : 0,
					}}
					onLoad={handleLoad}
					onError={handleError}
				>
					{isMapReady &&
						MARKERS.map((marker) => (
							<Marker
								key={marker.id}
								longitude={marker.longitude}
								latitude={marker.latitude}
								anchor="center"
							>
								<div
									className="size-6 overflow-hidden rounded-full border-2 border-white shadow-[0_3px_12px_rgba(15,23,42,0.25)] sm:size-9"
									style={{
										backgroundColor: marker.color,
										backgroundImage: `url("${avatarUrl(marker.id)}")`,
										backgroundPosition: "center",
										backgroundSize: "cover",
									}}
									aria-hidden="true"
								/>
							</Marker>
						))}
				</MapboxMap>
			</div>
		</div>
	);
}
