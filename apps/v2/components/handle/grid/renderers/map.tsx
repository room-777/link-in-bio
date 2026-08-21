import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ItemCaption } from "@/components/handle/grid/item-caption";
import { MapFallback } from "@/components/handle/grid/map/map-fallback";
import { useMapItemInteraction } from "@/components/handle/grid/map/map-item-interaction-context";
import { MapViewportGate } from "@/components/handle/grid/map/map-viewport-gate";
import {
  MapboxMapSurface,
  type MapboxMapSurfaceHandle,
} from "@/components/handle/grid/map/mapbox-map-surface";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import {
  isSameMapCamera,
  type MapCamera,
  normalizeMapCamera,
} from "@/lib/map/map-config";
import type { MapSearchResult } from "@/lib/map/mapbox-geocoding";

export function MapItemRenderer({
  item,
  mode,
  mapboxAccessToken,
  onCommand,
}: ItemRendererProps<GridItemByType<"map">>) {
  const { isLocationEditing, setLocationEditing, registerController } =
    useMapItemInteraction();
  const [mapError, setMapError] = useState<unknown>(null);
  const [geolocationError, setGeolocationError] = useState<unknown>(null);
  const [mapSurfaceKey, setMapSurfaceKey] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapSurfaceRef = useRef<MapboxMapSurfaceHandle>(null);
  const accessToken = mapboxAccessToken?.trim() || undefined;
  const normalizedCamera = normalizeMapCamera(item.data);
  const interactive = mode === "edit" && isLocationEditing;
  const showMapFallback = !accessToken || mapError !== null;

  useEffect(() => {
    const releaseGridDrag = () => mapSurfaceRef.current?.resumeInteractions();
    window.addEventListener("mouseup", releaseGridDrag, true);
    window.addEventListener("pointerup", releaseGridDrag, true);
    window.addEventListener("pointercancel", releaseGridDrag, true);
    window.addEventListener("blur", releaseGridDrag);

    return () => {
      window.removeEventListener("mouseup", releaseGridDrag, true);
      window.removeEventListener("pointerup", releaseGridDrag, true);
      window.removeEventListener("pointercancel", releaseGridDrag, true);
      window.removeEventListener("blur", releaseGridDrag);
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit") {
      setLocationEditing(false);
      setGeolocationError(null);
    }
  }, [mode, setLocationEditing]);

  const commitCamera = useCallback(
    function commitCamera(
      nextCamera: MapCamera,
      nextCaption = item.data.caption,
      allowWhenLocked = false,
    ) {
      if (mode !== "edit" || (!interactive && !allowWhenLocked) || !onCommand)
        return;
      if (
        isSameMapCamera(normalizedCamera, nextCamera) &&
        nextCaption === item.data.caption
      )
        return;

      onCommand({
        type: "update-data",
        itemId: item.id,
        data: {
          ...item.data,
          latitude: nextCamera.latitude,
          longitude: nextCamera.longitude,
          zoom: nextCamera.zoom,
          caption: nextCaption,
        },
      });
    },
    [item.data, item.id, interactive, mode, normalizedCamera, onCommand],
  );

  const handleLocationSelect = useCallback(
    (result: MapSearchResult) => {
      if (mode !== "edit") return;

      const nextCamera = {
        ...normalizedCamera,
        latitude: result.latitude,
        longitude: result.longitude,
      };
      const nextCaption = item.data.caption?.trim()
        ? item.data.caption
        : result.name || result.address;

      setGeolocationError(null);
      commitCamera(nextCamera, nextCaption, true);
      mapSurfaceRef.current?.flyTo(nextCamera);
    },
    [commitCamera, item.data.caption, mode, normalizedCamera],
  );

  useEffect(() => {
    registerController({
      zoomIn: () => mapSurfaceRef.current?.zoomIn(),
      zoomOut: () => mapSurfaceRef.current?.zoomOut(),
      locate: () => {
        setGeolocationError(null);
        mapSurfaceRef.current?.locate();
      },
      selectLocation: handleLocationSelect,
    });

    return () => registerController(null);
  }, [registerController, handleLocationSelect]);

  function retryMap() {
    setMapError(null);
    setIsMapReady(false);
    setMapSurfaceKey((key) => key + 1);
  }

  function handleGridDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        "a,button,input,textarea,select,video,[contenteditable='true'],[data-grid-item-drag-cancel='true']",
      )
    )
      return;

    mapSurfaceRef.current?.suspendInteractions();
  }

  return (
    <div
      className={`relative size-full overflow-hidden rounded-[inherit] bg-muted/30${isMapReady ? " surface-line" : ""}`}
      onPointerDownCapture={handleGridDragStart}
    >
      <div className="absolute inset-0">
        {showMapFallback ? (
          <MapFallback camera={normalizedCamera} onRetry={retryMap} />
        ) : (
          <MapViewportGate
            forceMount={mode === "edit" || interactive}
            placeholder={
              <div
                aria-hidden="true"
                className="size-full min-h-0 bg-muted/30"
              />
            }
          >
            <div
              data-grid-item-drag-cancel={interactive ? "true" : undefined}
              className="relative size-full min-h-0"
            >
              <MapboxMapSurface
                key={mapSurfaceKey}
                ref={mapSurfaceRef}
                accessToken={accessToken}
                camera={normalizedCamera}
                interactive={interactive}
                onMoveEnd={commitCamera}
                onGeolocate={(nextCamera) => {
                  setGeolocationError(null);
                  commitCamera(nextCamera);
                }}
                onGeolocateError={(error) => {
                  setGeolocationError(error ?? true);
                }}
                onError={setMapError}
                onReady={() => setIsMapReady(true)}
              />
            </div>
          </MapViewportGate>
        )}
      </div>

      <div className="pointer-events-none relative size-full">
        {geolocationError ? (
          <output
            aria-live="polite"
            className="pointer-events-auto absolute inset-x-0 top-4 z-20 mx-4 rounded-full bg-background/90 px-3 py-1 text-center text-xs font-medium text-destructive shadow-sm"
          >
            Couldn’t determine your location. Try again.
          </output>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white">
        <ItemCaption
          mode={mode}
          value={item.data.caption}
          onChange={(caption) =>
            onCommand?.({
              type: "update-data",
              itemId: item.id,
              data: { ...item.data, caption },
            })
          }
        />
      </div>
    </div>
  );
}
