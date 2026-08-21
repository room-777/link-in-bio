import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MapSearchResult } from "@/lib/map/mapbox-geocoding";

export type MapItemController = {
  zoomIn(): void;
  zoomOut(): void;
  locate(): void;
  selectLocation(result: MapSearchResult): void;
};

type MapItemInteractionContextValue = {
  isLocationEditing: boolean;
  setLocationEditing: Dispatch<SetStateAction<boolean>>;
  registerController(controller: MapItemController | null): void;
  zoomIn(): void;
  zoomOut(): void;
  locate(): void;
  selectLocation(result: MapSearchResult): void;
};

const MapItemInteractionContext =
  createContext<MapItemInteractionContextValue | null>(null);

export function MapItemInteractionProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
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
  const value = useMemo(
    () => ({
      isLocationEditing,
      setLocationEditing,
      registerController,
      zoomIn,
      zoomOut,
      locate,
      selectLocation,
    }),
    [
      isLocationEditing,
      registerController,
      zoomIn,
      zoomOut,
      locate,
      selectLocation,
    ],
  );

  return (
    <MapItemInteractionContext.Provider value={value}>
      {children}
    </MapItemInteractionContext.Provider>
  );
}

export function useMapItemInteraction(): MapItemInteractionContextValue {
  const context = useOptionalMapItemInteraction();
  if (!context) {
    throw new Error(
      "useMapItemInteraction must be used inside MapItemInteractionProvider",
    );
  }

  return context;
}

export function useOptionalMapItemInteraction(): MapItemInteractionContextValue | null {
  return useContext(MapItemInteractionContext);
}
