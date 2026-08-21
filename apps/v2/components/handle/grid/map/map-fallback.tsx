import { ItemExternalAction } from "@/components/handle/grid/item-external-action";
import { Button } from "@/components/ui/button";
import { toGoogleMapsUrl } from "@/lib/grid/item-registry";
import type { MapCamera } from "@/lib/map/map-config";

export type MapFallbackProps = {
  camera: MapCamera;
  onRetry(): void;
};

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function MapFallback({ camera, onRetry }: MapFallbackProps) {
  return (
    <div className="flex size-full min-h-0 items-center justify-center bg-muted/30 p-4 text-center">
      <div className="flex max-w-xs flex-col items-center gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Map unavailable
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatCoordinate(camera.latitude)},{" "}
            {formatCoordinate(camera.longitude)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
          <ItemExternalAction
            href={toGoogleMapsUrl(camera.latitude, camera.longitude)}
            ariaLabel="Open Google Maps"
          />
        </div>
      </div>
    </div>
  );
}
