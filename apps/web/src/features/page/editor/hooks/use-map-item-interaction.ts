import { useCallback, useMemo, useRef, useState } from "react";
import type { MapSearchResult } from "@/lib/mapbox-geocoding";

type MapItemController = {
	zoomIn(): void;
	zoomOut(): void;
	locate(): void;
	selectLocation(result: MapSearchResult): void;
};

export function useMapItemInteraction({
	disableLocationSearch = false,
}: {
	disableLocationSearch?: boolean;
}) {
	const [isLocationEditing, setLocationEditing] = useState(false);
	const controllerRef = useRef<MapItemController | null>(null);
	const registerController = useCallback(
		(controller: MapItemController | null) => {
			controllerRef.current = controller;
		},
		[],
	);
	const zoomIn = useCallback(() => controllerRef.current?.zoomIn(), []);
	const zoomOut = useCallback(() => controllerRef.current?.zoomOut(), []);
	const locate = useCallback(() => controllerRef.current?.locate(), []);
	const selectLocation = useCallback(
		(result: MapSearchResult) => controllerRef.current?.selectLocation(result),
		[],
	);
	return useMemo(
		() => ({
			isLocationEditing,
			disableLocationSearch,
			setLocationEditing,
			registerController,
			zoomIn,
			zoomOut,
			locate,
			selectLocation,
		}),
		[
			isLocationEditing,
			disableLocationSearch,
			registerController,
			zoomIn,
			zoomOut,
			locate,
			selectLocation,
		],
	);
}

export type MapItemInteraction = ReturnType<typeof useMapItemInteraction>;
