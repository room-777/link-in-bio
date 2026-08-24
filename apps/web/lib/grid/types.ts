import type { PageItemResponse } from "@grabbin/api";
import type {
  Breakpoint,
  DragDelta,
  ItemLayout,
  ItemType,
  LayoutMap,
  PageItemLayouts,
  PresetName,
} from "@grabbin/grid-layout";

export type {
  Breakpoint,
  DragDelta,
  ItemLayout,
  ItemType,
  LayoutMap,
  PageItemLayouts,
  PresetName,
};

export type GridItem = PageItemResponse & {
  preset: PresetName | null;
};

export type GridLayoutCommand =
  | {
      type: "move-item";
      itemId: string;
      layout: ItemLayout;
      dragDelta: DragDelta;
    }
  | {
      type: "replace-layout";
      breakpoint: Breakpoint;
      layout: LayoutMap;
    }
  | {
      type: "apply-preset";
      itemId: string;
      preset: PresetName;
      breakpoint?: Breakpoint;
    };

export type GridEditorCommand =
  | { type: "add-item"; itemType: ItemType; url?: string }
  | GridLayoutCommand
  | { type: "update-data"; itemId: string; data: PageItemResponse["data"] }
  | { type: "update-style"; itemId: string; patch: PageItemResponse["style"] }
  | { type: "delete-item"; itemId: string };

export type GridItemByType<Type extends ItemType = ItemType> = Extract<
  GridItem,
  { type: Type }
>;
