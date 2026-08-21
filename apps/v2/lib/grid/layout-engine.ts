import {
  compactWithGravity,
  getAllowedPresets,
  getColumns,
  getPresetGeometry,
  placeAtFirstAvailable,
  resolveAxisAwareSwap,
  validateLayout,
  validateLayoutForItem,
} from "@grabbin/grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import type {
  Breakpoint,
  GridItem,
  ItemLayout,
  ItemType,
  LayoutMap,
  PageItemLayouts,
  PresetName,
} from "@/lib/grid/types";

export {
  compactWithGravity,
  getAllowedPresets,
  getColumns,
  getPresetGeometry,
  placeAtFirstAvailable,
  resolveAxisAwareSwap,
  validateLayout,
  validateLayoutForItem,
};

function sameGeometry(a: ItemLayout, b: ItemLayout) {
  return a.w === b.w && a.h === b.h;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Use the exact vertical compactor configured on the rendered GridLayout.
 * A preset resize is a whole-layout operation: RGL orders affected items by
 * their current row and compacts the result, instead of finding an isolated
 * empty slot for each direct collision.
 */
function compactWithRenderedGridRules(
  layouts: LayoutMap,
  cols: number,
): LayoutMap {
  const compacted = fastVerticalCompactor.compact(
    Object.entries(layouts).map(([i, layout]) => ({
      i,
      ...layout,
    })),
    cols,
  );

  return Object.fromEntries(
    compacted.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]),
  ) as LayoutMap;
}

export function inferPresetFromLayouts(
  type: ItemType,
  layouts: PageItemLayouts,
): PresetName | null {
  for (const preset of getAllowedPresets(type)) {
    if (
      sameGeometry(layouts.wide, getPresetGeometry(preset, "wide")) &&
      sameGeometry(layouts.compact, getPresetGeometry(preset, "compact"))
    ) {
      return preset;
    }
  }

  return null;
}

export function inferPresetFromLayout(
  type: ItemType,
  layout: ItemLayout,
  breakpoint: Breakpoint,
): PresetName | null {
  for (const preset of getAllowedPresets(type)) {
    if (sameGeometry(layout, getPresetGeometry(preset, breakpoint))) {
      return preset;
    }
  }

  return null;
}

export function toLayoutMap(
  items: readonly Pick<GridItem, "id" | "layouts">[],
  breakpoint: Breakpoint,
): LayoutMap {
  return Object.fromEntries(
    items.map((item) => [item.id, { ...item.layouts[breakpoint] }]),
  ) as LayoutMap;
}

export function mergeLayoutMapIntoItems(
  items: readonly GridItem[],
  breakpoint: Breakpoint,
  layoutMap: LayoutMap,
): GridItem[] {
  return items.map((item) => {
    const nextLayout = layoutMap[item.id];
    if (!nextLayout) return item;

    return {
      ...item,
      layouts: {
        ...item.layouts,
        [breakpoint]: nextLayout,
      },
    };
  });
}

export function applyPresetToLayoutMap({
  layouts,
  itemId,
  itemType,
  preset,
  breakpoint,
}: {
  layouts: LayoutMap;
  itemId: string;
  itemType: ItemType;
  preset: PresetName;
  breakpoint: Breakpoint;
}): LayoutMap {
  const current = layouts[itemId];
  if (!current) {
    throw new Error(`Unknown item ${itemId}.`);
  }

  const cols = getColumns(breakpoint);
  const nextSize = getPresetGeometry(preset, breakpoint);
  const distanceToLeft = current.x;
  const distanceToRight = cols - (current.x + current.w);
  const anchorRight = distanceToRight < distanceToLeft;
  const nextX = anchorRight ? current.x + current.w - nextSize.w : current.x;
  const candidate: ItemLayout = {
    x: clamp(nextX, 0, cols - nextSize.w),
    y: current.y,
    w: nextSize.w,
    h: nextSize.h,
  };

  validateLayoutForItem(
    {
      type: itemType,
      preset,
      layout: candidate,
    },
    breakpoint,
  );

  return compactWithRenderedGridRules(
    {
      ...layouts,
      [itemId]: candidate,
    },
    cols,
  );
}

export function normalizeLayoutMap(
  layouts: LayoutMap,
  breakpoint: Breakpoint,
): LayoutMap {
  const cols = getColumns(breakpoint);
  validateLayout(layouts, cols);
  return compactWithGravity(layouts, cols);
}
