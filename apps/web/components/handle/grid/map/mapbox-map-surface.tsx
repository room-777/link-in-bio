import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MapboxMap, {
  GeolocateControl,
  type GeolocateControlInstance,
  type GeolocateResultEvent,
  type ErrorEvent as MapboxErrorEvent,
  type MapEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  MAPBOX_STYLE_URL,
  type MapCamera,
  sanitizeMapCamera,
} from "@/lib/map/map-config";
import { cn } from "@/lib/utils";

const MAPBOX_STYLE_CONFIG = {
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

const mapboxLib = import("mapbox-gl").then((module) => {
  if (typeof window !== "undefined") module.default.prewarm();
  return module;
});

export type MapboxMapSurfaceHandle = {
  flyTo(camera: MapCamera): void;
  suspendInteractions(): void;
  resumeInteractions(): void;
  zoomIn(): void;
  zoomOut(): void;
  locate(): void;
};

export type MapboxMapSurfaceProps = {
  accessToken: string;
  camera: MapCamera;
  interactive: boolean;
  onMoveEnd(camera: MapCamera): void;
  onGeolocate(camera: MapCamera): void;
  onGeolocateError(error: unknown): void;
  onError(error: unknown): void;
  onReady(): void;
};

type MapboxMapWithHandlers = MapEvent["target"] & {
  dragPan?: MapboxInteractionHandler;
  scrollZoom?: MapboxInteractionHandler;
  boxZoom?: MapboxInteractionHandler;
  doubleClickZoom?: MapboxInteractionHandler;
  keyboard?: MapboxInteractionHandler;
  touchZoomRotate?: MapboxInteractionHandler & {
    disableRotation(): void;
  };
};

type MapboxInteractionHandler = {
  disable(): void;
  enable(): void;
};

function getFlyToDuration() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 450;
}

function removeMapboxControls(map: MapEvent["target"]) {
  map
    .getContainer()
    .querySelectorAll(
      ".mapboxgl-ctrl, .mapboxgl-ctrl-icon, .mapboxgl-ctrl-logo",
    )
    .forEach((control) => {
      control.remove();
    });
}

function setMapInteractions(map: MapboxMapWithHandlers, enabled: boolean) {
  const handlers = [
    map.dragPan,
    map.scrollZoom,
    map.boxZoom,
    map.doubleClickZoom,
    map.keyboard,
    map.touchZoomRotate,
  ];

  for (const handler of handlers) {
    if (enabled) handler?.enable();
    else handler?.disable();
  }

  map.touchZoomRotate?.disableRotation();
}

export const MapboxMapSurface = forwardRef<
  MapboxMapSurfaceHandle,
  MapboxMapSurfaceProps
>(function MapboxMapSurface(
  {
    accessToken,
    camera,
    interactive,
    onMoveEnd,
    onGeolocate,
    onGeolocateError,
    onError,
    onReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const geolocateControlRef = useRef<GeolocateControlInstance>(null);
  const mapRef = useRef<MapRef>(null);
  const mapErrorReportedRef = useRef(false);
  const mapLoadedRef = useRef(false);
  const pendingCameraRef = useRef<MapCamera | null>(null);
  const interactionsSuspendedRef = useRef(false);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isContainerSized, setIsContainerSized] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof ResizeObserver === "undefined") {
      setIsContainerSized(true);
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? {};
      const hasSize = width > 0 && height > 0;
      setIsContainerSized(hasSize);

      if (!hasSize) return;

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        resizeTimeoutRef.current = null;
        mapRef.current?.getMap().resize();
      }, 120);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(nextCamera) {
        pendingCameraRef.current = nextCamera;
        if (!mapLoadedRef.current || !mapRef.current) return;

        pendingCameraRef.current = null;
        mapRef.current.flyTo({
          center: [nextCamera.longitude, nextCamera.latitude],
          zoom: nextCamera.zoom,
          duration: getFlyToDuration(),
        });
      },
      suspendInteractions() {
        if (interactionsSuspendedRef.current || !mapRef.current) return;

        const map = mapRef.current.getMap() as MapboxMapWithHandlers;
        setMapInteractions(map, false);
        interactionsSuspendedRef.current = true;
      },
      resumeInteractions() {
        if (!interactionsSuspendedRef.current || !mapRef.current) return;

        const map = mapRef.current.getMap() as MapboxMapWithHandlers;
        setMapInteractions(map, interactive);
        interactionsSuspendedRef.current = false;
      },
      zoomIn() {
        if (!interactive) return;
        mapRef.current?.getMap().zoomIn();
      },
      zoomOut() {
        if (!interactive) return;
        mapRef.current?.getMap().zoomOut();
      },
      locate() {
        if (!interactive) return;
        geolocateControlRef.current?.trigger();
      },
    }),
    [interactive],
  );

  useEffect(() => {
    if (!interactive) return;
    mapRef.current?.getMap().touchZoomRotate.disableRotation();
  }, [interactive]);

  useEffect(() => {
    if (!interactive || !mapLoadedRef.current || !mapRef.current) return;

    const frame = requestAnimationFrame(() => {
      const map = mapRef.current?.getMap();
      if (map) removeMapboxControls(map);
    });

    return () => cancelAnimationFrame(frame);
  }, [interactive]);

  function handleMoveEnd(event: ViewStateChangeEvent) {
    const nextCamera = sanitizeMapCamera(event.viewState);
    if (nextCamera) onMoveEnd(nextCamera);
  }

  function handleGeolocate(event: GeolocateResultEvent) {
    const nextCamera = sanitizeMapCamera({
      latitude: event.coords.latitude,
      longitude: event.coords.longitude,
      zoom: mapRef.current?.getZoom() ?? camera.zoom,
    });
    if (nextCamera) onGeolocate(nextCamera);
  }

  function handleMapError(event: MapboxErrorEvent) {
    if (mapLoadedRef.current) return;
    if (mapErrorReportedRef.current) return;
    mapErrorReportedRef.current = true;
    onError(event);
  }

  function handleMapLoad(event: MapEvent) {
    event.target.setTerrain(null);
    setMapInteractions(event.target as MapboxMapWithHandlers, interactive);
    removeMapboxControls(event.target);
    mapLoadedRef.current = true;
    onReady();

    const pendingCamera = pendingCameraRef.current;
    if (!pendingCamera) return;

    pendingCameraRef.current = null;
    event.target.flyTo({
      center: [pendingCamera.longitude, pendingCamera.latitude],
      zoom: pendingCamera.zoom,
      duration: getFlyToDuration(),
    });
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative size-full min-h-0 overflow-hidden",
        interactive ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {isContainerSized ? (
        <MapboxMap
          ref={mapRef}
          mapLib={mapboxLib}
          {...({ config: MAPBOX_STYLE_CONFIG } as const)}
          mapboxAccessToken={accessToken}
          mapStyle={MAPBOX_STYLE_URL}
          attributionControl={false}
          interactive={interactive}
          initialViewState={{
            longitude: camera.longitude,
            latitude: camera.latitude,
            zoom: camera.zoom,
          }}
          projection="mercator"
          pitch={0}
          maxPitch={0}
          dragRotate={false}
          touchPitch={false}
          dragPan={interactive}
          scrollZoom={interactive}
          boxZoom={interactive}
          doubleClickZoom={interactive}
          keyboard={interactive}
          touchZoomRotate={interactive}
          minZoom={MAP_ZOOM_MIN}
          maxZoom={MAP_ZOOM_MAX}
          style={{ height: "100%", width: "100%" }}
          onMoveEnd={handleMoveEnd}
          onLoad={handleMapLoad}
          onError={handleMapError}
        >
          {interactive ? (
            <GeolocateControl
              ref={geolocateControlRef}
              position="top-right"
              showButton={false}
              showUserLocation={false}
              showAccuracyCircle={false}
              trackUserLocation={false}
              onGeolocate={handleGeolocate}
              onError={onGeolocateError}
            />
          ) : null}
        </MapboxMap>
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      >
        <span className="absolute size-12 animate-ping animation-duration-[2.5s] rounded-full bg-brand/35" />
        <span className="relative size-7 rounded-full bg-white p-1 beautiful-shadow drop-shadow-lg smooth-ring-neutral-300/40!">
          <span className="block size-full rounded-full bg-brand" />
        </span>
      </div>
    </div>
  );
});
