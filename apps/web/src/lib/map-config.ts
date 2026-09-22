export const MAPBOX_STYLE_URL =
	"mapbox://styles/justhumanb2ing/cmk406try001601pr180409zf";

export const MAPBOX_STYLE_CONFIG = {
	basemap: {
		show3dObjects: false,
		show3dBuildings: false,
		show3dFacades: false,
		show3dTrees: false,
		show3dLandmarks: false,
		showLandmarkIcons: false,
		showLandmarkIconLabels: false,
		showPointOfInterestLabels: false,
		showTransitLabels: false,
		showAdminBoundaries: false,
		showPedestrianRoads: false,
		showRoadLabels: false,
	},
} as const;

export const MAP_ZOOM_MIN = 0;
export const MAP_ZOOM_MAX = 22;
export const DEFAULT_MAP_ZOOM = 12;

export type MapCamera = {
	latitude: number;
	longitude: number;
	zoom: number;
};

export function normalizeMapCamera(data: {
	latitude: number;
	longitude: number;
	zoom?: number;
}): MapCamera {
	return {
		latitude: data.latitude,
		longitude: data.longitude,
		zoom:
			typeof data.zoom === "number" &&
			Number.isFinite(data.zoom) &&
			data.zoom >= MAP_ZOOM_MIN &&
			data.zoom <= MAP_ZOOM_MAX
				? data.zoom
				: DEFAULT_MAP_ZOOM,
	};
}

export function sanitizeMapCamera(data: {
	latitude: number;
	longitude: number;
	zoom: number;
}): MapCamera | undefined {
	if (
		!Number.isFinite(data.latitude) ||
		!Number.isFinite(data.longitude) ||
		!Number.isFinite(data.zoom)
	)
		return undefined;

	return {
		latitude: data.latitude,
		longitude: data.longitude,
		zoom: Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, data.zoom)),
	};
}
