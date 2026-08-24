export const MAPBOX_STYLE_URL =
  "mapbox://styles/justhumanb2ing/cmk406try001601pr180409zf";

export const DEFAULT_MAP_LOCATION = {
  latitude: 35.6762,
  longitude: 139.6503,
} as const;

export const DEFAULT_MAP_ZOOM = 12;
export const MAP_ZOOM_MIN = 0;
export const MAP_ZOOM_MAX = 22;

const MAP_CAMERA_COORDINATE_EPSILON = 0.000001;
const MAP_CAMERA_ZOOM_EPSILON = 0.001;

export type MapCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
};

type MapCameraInput = {
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

export function sanitizeMapCamera(data: MapCameraInput): MapCamera | undefined {
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

export function isSameMapCamera(left: MapCamera, right: MapCamera): boolean {
  return (
    Math.abs(left.latitude - right.latitude) <= MAP_CAMERA_COORDINATE_EPSILON &&
    Math.abs(left.longitude - right.longitude) <=
      MAP_CAMERA_COORDINATE_EPSILON &&
    Math.abs(left.zoom - right.zoom) <= MAP_CAMERA_ZOOM_EPSILON
  );
}
