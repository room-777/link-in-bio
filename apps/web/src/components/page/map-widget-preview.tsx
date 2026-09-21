"use client";

import { env } from "@grabbin/env/web";
import MapboxMap from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { MAPBOX_STYLE_URL } from "@/lib/map-config";

const mapboxLib = import("mapbox-gl");

const NEW_YORK_VIEW = {
	longitude: -73.9747,
	latitude: 40.7188,
	zoom: 10.2,
} as const;

function MapAtmosphere() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-10"
		>
			<span className="map-widget-marker absolute top-[38%] left-[68%] size-5">
				<span className="map-widget-marker-ping absolute -inset-0.5 rounded-full bg-blue-400/70" />
				<span className="relative z-10 block size-5 rounded-full border-2 border-white bg-blue-400 shadow-[0_2px_5px_rgb(0_0_0/25%)]" />
			</span>
			<motion.span
				className="map-widget-plane absolute top-[58%] left-[-12%] text-base drop-shadow-[0_1px_2px_rgb(0_0_0/35%)]"
				initial={false}
				animate={
					shouldReduceMotion
						? { opacity: 0.75, scale: 0.9, x: 120, y: -42 }
						: {
								opacity: [0, 0.95, 0.95, 0],
								scale: [0.8, 1, 1, 0.8],
								x: [0, 60, 145, 330],
								y: [68, 24, -22, -150],
							}
				}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: {
								duration: 20,
								ease: "linear",
								repeat: Number.POSITIVE_INFINITY,
							}
				}
			>
				✈️
			</motion.span>
		</div>
	);
}

export function MapWidgetPreview() {
	const accessToken = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
	const [isMapLoaded, setIsMapLoaded] = useState(false);

	return (
		<div className="mapbox-clean pointer-events-none relative size-full overflow-hidden rounded-md bg-secondary/80">
			{accessToken ? (
				<div
					className={`absolute inset-0 transition-opacity duration-500 ${
						isMapLoaded ? "opacity-100" : "opacity-0"
					}`}
				>
					<MapboxMap
						mapLib={mapboxLib}
						reuseMaps
						mapboxAccessToken={accessToken}
						mapStyle={MAPBOX_STYLE_URL}
						initialViewState={NEW_YORK_VIEW}
						attributionControl={false}
						interactive={false}
						projection="mercator"
						pitch={0}
						bearing={0}
						dragRotate={false}
						touchPitch={false}
						style={{ height: "100%", width: "100%" }}
						onLoad={(event) => event.target.resize()}
						onIdle={() => setIsMapLoaded(true)}
					/>
				</div>
			) : null}
			{isMapLoaded ? <MapAtmosphere /> : null}
		</div>
	);
}
