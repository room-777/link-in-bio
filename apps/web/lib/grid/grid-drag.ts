import type { ItemLayout, LayoutMap } from "@/lib/grid/types";

export type GridPosition = ItemLayout & { i: string };

export function toLayoutMap(layout: readonly GridPosition[]): LayoutMap {
  return Object.fromEntries(
    layout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]),
  ) as LayoutMap;
}

export function isOutsideGrid(layout: LayoutMap, cols: number): boolean {
  return Object.values(layout).some(
    (item) => item.x < 0 || item.y < 0 || item.x + item.w > cols,
  );
}

export function resolveDraggedLayout({
  nextLayout,
  dragStartLayout,
  cols,
}: {
  nextLayout: readonly GridPosition[];
  dragStartLayout: LayoutMap;
  cols: number;
}): { layout: LayoutMap; outsideGrid: boolean } {
  const nextLayoutMap = toLayoutMap(nextLayout);
  const outsideGrid = isOutsideGrid(nextLayoutMap, cols);
  return {
    layout: outsideGrid ? dragStartLayout : nextLayoutMap,
    outsideGrid,
  };
}
