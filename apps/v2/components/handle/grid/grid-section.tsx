"use client";

import {
  getGridWidth,
  gridContainerPadding,
  gridMargin,
  gridRowHeight,
} from "@grabbin/grid-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, {
  type EventCallback,
  useContainerWidth,
} from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import {
  GRID_ITEM_DRAG_CANCEL_SELECTOR,
  GridItemShell,
} from "@/components/handle/grid/grid-item-shell";
import { ItemRenderer } from "@/components/handle/grid/item-renderer";
import { useGridDragMotion } from "@/hooks/use-grid-drag-motion";
import { resolveDraggedLayout, toLayoutMap } from "@/lib/grid/grid-drag";
import {
  type GridItemCommandHandler,
  getItemCapabilities,
} from "@/lib/grid/item-registry";
import { getColumns, inferPresetFromLayout } from "@/lib/grid/layout-engine";
import type { Breakpoint, GridItem, LayoutMap } from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

type GridSectionProps = {
  items: readonly GridItem[];
  breakpoint: Breakpoint;
  mode: PageMode;
  mapboxAccessToken?: string;
  autoFocusItemId?: string | null;
  onAutoFocus?: (itemId: string) => void;
  onCommand: GridItemCommandHandler;
};

const GRID_ITEM_EXIT_DURATION = 180;
const WIDE_CONTAINER_MIN_WIDTH = getGridWidth(getColumns("wide"));

export function GridSection({
  items,
  breakpoint,
  mode,
  mapboxAccessToken,
  autoFocusItemId = null,
  onAutoFocus,
  onCommand,
}: GridSectionProps) {
  const {
    width: containerWidth,
    containerRef,
    mounted,
  } = useContainerWidth({
    measureBeforeMount: true,
  });
  const dragStartLayoutRef = useRef<LayoutMap | null>(null);
  const knownItemIdsRef = useRef(new Set<string>());
  const hasInitializedItemsRef = useRef(false);
  const enteringItemFramesRef = useRef(new Map<string, number>());
  const newItemScrollFramesRef = useRef(new Map<string, number>());
  const exitingItemTimersRef = useRef(new Map<string, number>());
  const previousItemsByIdRef = useRef(
    new Map(items.map((item) => [item.id, item])),
  );
  const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [exitingItems, setExitingItems] = useState<
    ReadonlyMap<string, GridItem>
  >(new Map());
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const dragMotion = useGridDragMotion();
  const effectiveBreakpoint = !mounted
    ? null
    : containerWidth >= WIDE_CONTAINER_MIN_WIDTH
      ? breakpoint
      : "compact";
  const resolvedBreakpoint = effectiveBreakpoint ?? "compact";
  const cols = getColumns(resolvedBreakpoint);
  const gridWidth = effectiveBreakpoint === null ? 0 : getGridWidth(cols);
  const displayItems = useMemo(() => {
    const itemIds = new Set(items.map((item) => item.id));
    return [
      ...items,
      ...[...exitingItems.entries()]
        .filter(([itemId]) => !itemIds.has(itemId))
        .map(([, item]) => item),
    ];
  }, [exitingItems, items]);

  const startItemExit = useCallback((item: GridItem) => {
    if (exitingItemTimersRef.current.has(item.id)) return;
    setExitingItems((current) => new Map(current).set(item.id, item));
    exitingItemTimersRef.current.set(
      item.id,
      window.setTimeout(() => {
        setExitingItems((current) => {
          const next = new Map(current);
          next.delete(item.id);
          return next;
        });
        exitingItemTimersRef.current.delete(item.id);
      }, GRID_ITEM_EXIT_DURATION),
    );
  }, []);

  useEffect(() => {
    if (mode !== "edit") return;
    const newItemIds = hasInitializedItemsRef.current
      ? items
          .filter((item) => !knownItemIdsRef.current.has(item.id))
          .map((item) => item.id)
      : [];
    knownItemIdsRef.current = new Set(items.map((item) => item.id));
    hasInitializedItemsRef.current = true;
    if (newItemIds.length === 0) return;

    setEnteringItemIds((current) => new Set([...current, ...newItemIds]));
    for (const itemId of newItemIds) {
      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          setEnteringItemIds((current) => {
            const next = new Set(current);
            next.delete(itemId);
            return next;
          });
          enteringItemFramesRef.current.delete(itemId);
          const itemShell = document.querySelector<HTMLElement>(
            `[data-grid-item-id="${CSS.escape(itemId)}"]`,
          );
          if (itemShell) {
            itemShell.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
              block: "nearest",
              inline: "nearest",
            });
          }
          newItemScrollFramesRef.current.delete(itemId);
        });
        enteringItemFramesRef.current.set(itemId, secondFrame);
        newItemScrollFramesRef.current.set(itemId, secondFrame);
      });
      enteringItemFramesRef.current.set(itemId, firstFrame);
    }
  }, [items, mode]);

  useEffect(() => {
    const currentItemsById = new Map(items.map((item) => [item.id, item]));
    for (const [itemId, previousItem] of previousItemsByIdRef.current) {
      if (!currentItemsById.has(itemId)) startItemExit(previousItem);
    }
    for (const itemId of currentItemsById.keys()) {
      const timer = exitingItemTimersRef.current.get(itemId);
      if (timer === undefined) continue;
      window.clearTimeout(timer);
      exitingItemTimersRef.current.delete(itemId);
      setExitingItems((current) => {
        const next = new Map(current);
        next.delete(itemId);
        return next;
      });
    }
    previousItemsByIdRef.current = currentItemsById;
  }, [items, startItemExit]);

  useEffect(
    () => () => {
      for (const frame of enteringItemFramesRef.current.values()) {
        window.cancelAnimationFrame(frame);
      }
      for (const frame of newItemScrollFramesRef.current.values()) {
        window.cancelAnimationFrame(frame);
      }
      for (const timer of exitingItemTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const layout = useMemo(
    () =>
      displayItems.map((item) => ({
        i: item.id,
        ...item.layouts[resolvedBreakpoint],
        isResizable: false,
        resizeHandles: [],
      })),
    [displayItems, resolvedBreakpoint],
  );

  const handleGridCommand = useCallback<GridItemCommandHandler>(
    (command) => {
      if (command.type === "delete-item") {
        const item = displayItems.find(
          (candidate) => candidate.id === command.itemId,
        );
        if (item) startItemExit(item);
      }
      return onCommand(
        command.type === "apply-preset"
          ? { ...command, breakpoint: resolvedBreakpoint }
          : command,
      );
    },
    [displayItems, onCommand, resolvedBreakpoint, startItemExit],
  );

  const handleDragStart: EventCallback = useCallback(
    (currentLayout, oldItem, newItem, placeholder, event, element) => {
      dragMotion.onDragStart(
        currentLayout,
        oldItem,
        newItem,
        placeholder,
        event,
        element,
      );
      dragStartLayoutRef.current = toLayoutMap(currentLayout);
      setDraggingItemId(oldItem?.i ?? null);
    },
    [dragMotion],
  );

  const handleDrag: EventCallback = useCallback(
    (currentLayout, oldItem, newItem, placeholder, event, element) => {
      dragMotion.onDrag(
        currentLayout,
        oldItem,
        newItem,
        placeholder,
        event,
        element,
      );
    },
    [dragMotion],
  );

  const handleDragStop: EventCallback = useCallback(
    (nextLayout, oldItem, newItem, placeholder, event, element) => {
      dragMotion.onDragStop(
        nextLayout,
        oldItem,
        newItem,
        placeholder,
        event,
        element,
      );
      const resolved = resolveDraggedLayout({
        nextLayout,
        dragStartLayout: dragStartLayoutRef.current ?? toLayoutMap(layout),
        cols,
      });
      if (resolved.outsideGrid) setLayoutRevision((revision) => revision + 1);
      dragStartLayoutRef.current = null;
      setDraggingItemId(null);
      onCommand({
        type: "replace-layout",
        breakpoint: resolvedBreakpoint,
        layout: resolved.layout,
      });
    },
    [cols, dragMotion, layout, onCommand, resolvedBreakpoint],
  );

  const bottomPaddingClass =
    mode === "edit" || !mounted || containerWidth < WIDE_CONTAINER_MIN_WIDTH
      ? mounted && containerWidth >= WIDE_CONTAINER_MIN_WIDTH
        ? "pb-80"
        : "pb-64"
      : "";

  return (
    <div
      ref={containerRef}
      className={`grid-section-shell flex min-w-full max-w-full shrink-0 justify-center overflow-visible ${bottomPaddingClass}`}
      style={effectiveBreakpoint === null ? undefined : { width: gridWidth }}
    >
      {effectiveBreakpoint === null ? null : (
        <GridLayout
          key={`${effectiveBreakpoint}-${layoutRevision}`}
          className={`sinabro-grid-layout max-w-full overflow-visible${mode === "edit" ? " is-edit-mode" : ""}`}
          style={{ width: gridWidth }}
          layout={layout}
          width={gridWidth}
          gridConfig={{
            cols,
            rowHeight: gridRowHeight,
            margin: gridMargin,
            containerPadding: gridContainerPadding,
          }}
          dragConfig={{
            enabled: mode === "edit",
            bounded: false,
            cancel: GRID_ITEM_DRAG_CANCEL_SELECTOR,
          }}
          resizeConfig={{ enabled: false }}
          autoSize
          compactor={fastVerticalCompactor}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragStop={handleDragStop}
        >
          {displayItems.map((item) => {
            const itemLayout = item.layouts[effectiveBreakpoint];
            const preset = inferPresetFromLayout(
              item.type,
              itemLayout,
              effectiveBreakpoint,
            );
            const capabilities = getItemCapabilities(item, {
              breakpoint: effectiveBreakpoint,
              mode,
            });

            return (
              <div key={item.id}>
                <GridItemShell
                  item={item}
                  isEntering={enteringItemIds.has(item.id)}
                  isExiting={exitingItems.has(item.id)}
                  isAnyItemDragging={draggingItemId !== null}
                  isDragging={draggingItemId === item.id}
                  capabilities={capabilities}
                  onCommand={handleGridCommand}
                >
                  {capabilities.canRender && preset !== null ? (
                    <ItemRenderer
                      item={item}
                      breakpoint={effectiveBreakpoint}
                      preset={preset}
                      mode={mode}
                      mapboxAccessToken={mapboxAccessToken}
                      capabilities={capabilities}
                      isDragging={draggingItemId === item.id}
                      autoFocus={item.id === autoFocusItemId}
                      onAutoFocus={
                        onAutoFocus ? () => onAutoFocus(item.id) : undefined
                      }
                      onCommand={handleGridCommand}
                    />
                  ) : null}
                </GridItemShell>
              </div>
            );
          })}
        </GridLayout>
      )}
    </div>
  );
}
