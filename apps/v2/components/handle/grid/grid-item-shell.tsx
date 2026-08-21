import { getLinkProviderPresentation } from "@grabbin/api";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { ItemDeleteButton } from "@/components/handle/grid/item-controls";
import {
  MapItemInteractionProvider,
  useOptionalMapItemInteraction,
} from "@/components/handle/grid/map/map-item-interaction-context";
import {
  MediaCropInteractionProvider,
  useOptionalMediaCropInteraction,
} from "@/components/handle/grid/media-crop-interaction-context";
import type {
  GridItemCommandHandler,
  ItemCapabilities,
} from "@/lib/grid/item-registry";
import { getItemViewRegistration } from "@/lib/grid/item-registry";
import type { GridItem } from "@/lib/grid/types";
import { getLinkCardThemeStyle } from "@/lib/link/provider-presentation";
import { cn } from "@/lib/utils";

export const GRID_ITEM_DRAG_CANCEL_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "video",
  "[contenteditable='true']",
  "[data-grid-item-drag-cancel='true']",
].join(",");

type GridItemShellProps = {
  item: GridItem;
  isEntering?: boolean;
  isExiting?: boolean;
  isAnyItemDragging?: boolean;
  isDragging?: boolean;
  capabilities: ItemCapabilities;
  onCommand?: GridItemCommandHandler;
  children?: ReactNode;
};

function RuntimeFallback({ item }: { item: GridItem }) {
  return (
    <div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      Unsupported {item.type} item
    </div>
  );
}

function getCardThemeStyle(item: GridItem): CSSProperties | undefined {
  if (item.type !== "link") return undefined;
  const provider = getLinkProviderPresentation(item.data.url).id;
  return getLinkCardThemeStyle(provider);
}

function getCardStyle(item: GridItem): CSSProperties | undefined {
  const themeStyle = getCardThemeStyle(item);
  const backgroundColor = item.style.backgroundColor;
  if (typeof backgroundColor !== "string") return themeStyle;

  return { ...themeStyle, backgroundColor };
}

export function GridItemShell(props: GridItemShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const content = (
    <MediaCropInteractionProvider containerRef={shellRef}>
      <GridItemShellContent {...props} shellRef={shellRef} />
    </MediaCropInteractionProvider>
  );

  return props.item.type === "map" ? (
    <MapItemInteractionProvider key={props.item.id}>
      {content}
    </MapItemInteractionProvider>
  ) : (
    content
  );
}

function GridItemShellContent({
  item,
  isEntering = false,
  isExiting = false,
  isAnyItemDragging = false,
  isDragging = false,
  capabilities,
  onCommand,
  children,
  shellRef,
}: GridItemShellProps & {
  shellRef: RefObject<HTMLDivElement | null>;
}) {
  const mapInteraction = useOptionalMapItemInteraction();
  const mediaCropInteraction = useOptionalMediaCropInteraction();
  const isMediaCropOpen =
    item.type === "media" && Boolean(mediaCropInteraction?.isOpen);
  const keepControlsVisible =
    (item.type === "map" && Boolean(mapInteraction?.isLocationEditing)) ||
    isMediaCropOpen;
  const hasContent = children !== null && children !== undefined;
  const hasControls =
    capabilities.controls.some(
      (control) => control.command !== "delete-item",
    ) &&
    onCommand &&
    !isAnyItemDragging &&
    !isExiting;
  const hasDeleteControl =
    capabilities.controls.some(
      (control) => control.command === "delete-item",
    ) &&
    onCommand &&
    !isAnyItemDragging &&
    !isExiting &&
    !isMediaCropOpen;
  const ControlsView = getItemViewRegistration(item).controls;
  const hideControlsTimer = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const cardThemeStyle = getCardThemeStyle(item);
  const cardStyle = getCardStyle(item);
  const isChromeLess = item.style.chromeLess === true;

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current !== null) {
        window.clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  function showControls() {
    pointerInsideRef.current = true;
    if (hideControlsTimer.current !== null) {
      window.clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
    setControlsOpen(true);
  }

  function hideControls() {
    pointerInsideRef.current = false;
    if (hideControlsTimer.current !== null) {
      window.clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = window.setTimeout(() => {
      setControlsOpen(false);
      hideControlsTimer.current = null;
    }, 120);
  }

  useEffect(() => {
    if (isAnyItemDragging) {
      if (hideControlsTimer.current !== null) {
        window.clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = null;
      }
      setControlsOpen(false);
      return;
    }
    if (!pointerInsideRef.current) return;

    setControlsOpen(true);
  }, [isAnyItemDragging]);

  const shell = (
    <div
      ref={shellRef}
      data-grid-item-shell="true"
      data-grid-item-id={item.id}
      data-grid-item-type={item.type}
      data-grid-item-preset={item.preset ?? "unsupported"}
      data-grid-item-crop-open={isMediaCropOpen ? "true" : undefined}
      data-grid-item-drag-cancel-selector={GRID_ITEM_DRAG_CANCEL_SELECTOR}
      className={cn(
        "group/grid-item relative size-full overflow-visible rounded-2xl",
        "grid-item-pop-in",
        isEntering && "is-entering",
        isExiting && "is-exiting",
        "transition-[z-index] hover:z-50 focus-within:z-50",
      )}
      onPointerEnter={() => {
        if (isAnyItemDragging) return;
        pointerInsideRef.current = true;
        showControls();
      }}
      onPointerLeave={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          shellRef.current?.contains(event.relatedTarget)
        ) {
          return;
        }
        hideControls();
      }}
    >
      <div
        data-grid-item-card="true"
        className={cn(
          "grid-item-card relative size-full overflow-hidden rounded-2xl",
          "bg-background",
          isDragging
            ? "smooth-shadow-ring-xl shadow-neutral-600 smooth-ring-neutral-300/30 transition-all"
            : !isChromeLess && "shadow-sm",
          isMediaCropOpen && "overflow-visible!",
          !isDragging && isMediaCropOpen && "media-crop-interaction",
          item.type === "map" && "map-item-interaction",
          cardThemeStyle && "link-card-themed",
          isChromeLess
            ? "border-0!"
            : !isDragging && item.type !== "media" && "ring-1 ring-black/5",
          !isDragging &&
            item.type === "map" &&
            mapInteraction?.isLocationEditing &&
            "map-item-location-editing scale-[1.02] ring-3 ring-black",
        )}
        style={cardStyle}
      >
        <div className="relative z-10 size-full min-h-0 rounded-[inherit]">
          {hasContent ? children : <RuntimeFallback item={item} />}
        </div>
      </div>
      {hasDeleteControl ? (
        <ItemDeleteButton itemId={item.id} onCommand={onCommand} />
      ) : null}
      {hasControls ? (
        <div
          data-grid-item-controls="true"
          data-grid-item-drag-cancel="true"
          className={cn(
            "absolute top-full left-1/2 z-99999 mt-2 -translate-x-1/2 -translate-y-1/2",
            "transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "focus-within:pointer-events-auto focus-within:opacity-100",
            controlsOpen || keepControlsVisible
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
          onPointerEnter={showControls}
          onPointerLeave={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              shellRef.current?.contains(event.relatedTarget)
            ) {
              return;
            }
            hideControls();
          }}
        >
          <div className="w-max">
            <ControlsView
              item={item}
              capabilities={capabilities}
              onCommand={onCommand}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return shell;
}
