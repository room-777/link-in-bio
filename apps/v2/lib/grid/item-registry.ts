import type { ReactNode } from "react";
import { ItemControls } from "@/components/handle/grid/item-controls";
import { LinkItemRenderer } from "@/components/handle/grid/renderers/link";
import { MapItemRenderer } from "@/components/handle/grid/renderers/map";
import { MediaItemRenderer } from "@/components/handle/grid/renderers/media";
import { SectionItemRenderer } from "@/components/handle/grid/renderers/section";
import { TextItemRenderer } from "@/components/handle/grid/renderers/text";
import { inferPresetFromLayout } from "@/lib/grid/layout-engine";
import { getAllowedPresets } from "@/lib/grid/layout-presets";
import type {
  Breakpoint,
  GridEditorCommand,
  GridItem,
  GridItemByType,
  ItemType,
  PresetName,
} from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

export type GridItemControlCommand =
  | "manage-link"
  | "apply-preset"
  | "crop-media"
  | "delete-item";

export type GridItemCommandHandler = (
  command: GridEditorCommand,
) => GridItem | undefined;

export type ItemControlCapability = {
  command: GridItemControlCommand;
  label: string;
  preset?: PresetName;
  isActive?: boolean;
};

export type ItemCapabilities = {
  allowedPresets: readonly PresetName[];
  controls: readonly ItemControlCapability[];
  canRender: boolean;
};

export type ItemCapabilityContext = {
  breakpoint: Breakpoint;
  mode: PageMode;
};

export type ItemRendererProps<Item extends GridItem = GridItem> = {
  item: Item;
  breakpoint: Breakpoint;
  preset: PresetName;
  mode: PageMode;
  capabilities?: ItemCapabilities;
  mapboxAccessToken?: string;
  isDragging?: boolean;
  isEnriching?: boolean;
  autoFocus?: boolean;
  onAutoFocus?: () => void;
  onCommand?: GridItemCommandHandler;
};

export type ItemControlsProps<Item extends GridItem = GridItem> = {
  item: Item;
  capabilities: ItemCapabilities;
  onCommand?: GridItemCommandHandler;
};

export type ItemRendererView<Item extends GridItem = GridItem> = (
  props: ItemRendererProps<Item>,
) => ReactNode;

export type ItemControlsView<Item extends GridItem = GridItem> = (
  props: ItemControlsProps<Item>,
) => ReactNode;

export type ItemViewRegistration<Item extends GridItem = GridItem> = {
  renderer: ItemRendererView<Item>;
  controls: ItemControlsView<Item>;
};

export type ItemViewRegistry = {
  [Type in ItemType]: ItemViewRegistration<GridItemByType<Type>>;
};

export function getItemViewRegistration(
  item: GridItem,
): ItemViewRegistration<GridItem> {
  return itemViewRegistry[
    item.type
  ] as unknown as ItemViewRegistration<GridItem>;
}

export function toGoogleMapsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${latitude},${longitude}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function getItemCapabilities(
  item: GridItem,
  context: ItemCapabilityContext,
): ItemCapabilities {
  const allowedPresets = getAllowedPresets(item.type);
  const preset = inferPresetFromLayout(
    item.type,
    item.layouts[context.breakpoint],
    context.breakpoint,
  );
  const canRender = preset !== null && allowedPresets.includes(preset);
  const controls: ItemControlCapability[] = [];

  if (canRender && context.mode === "edit" && allowedPresets.length > 1) {
    for (const nextPreset of allowedPresets) {
      controls.push({
        command: "apply-preset",
        label: getPresetControlLabel(nextPreset),
        preset: nextPreset,
        isActive: nextPreset === preset,
      });
    }
  }

  if (
    canRender &&
    context.mode === "edit" &&
    (item.type === "text" || item.type === "media")
  ) {
    controls.push({
      command: "manage-link",
      label: item.data.link ? "Change link" : "Add link",
    });
  }

  if (canRender && context.mode === "edit" && item.type === "media") {
    controls.push({
      command: "crop-media",
      label: "Crop media",
    });
  }

  if (context.mode === "edit") {
    controls.push({
      command: "delete-item",
      label: "Delete",
    });
  }

  return {
    allowedPresets,
    controls,
    canRender,
  };
}

function getPresetControlLabel(preset: PresetName): string {
  switch (preset) {
    case "halfBanner":
      return "Half banner";
    case "squareSmall":
      return "Small square";
    case "landscape":
      return "Wide";
    case "squareLarge":
      return "Full square";
    case "portrait":
      return "Portrait";
    case "fullBanner":
      return "Full banner";
  }
}

export const itemViewRegistry: ItemViewRegistry = {
  text: {
    renderer: TextItemRenderer,
    controls: ItemControls,
  },
  media: {
    renderer: MediaItemRenderer,
    controls: ItemControls,
  },
  map: {
    renderer: MapItemRenderer,
    controls: ItemControls,
  },
  section: {
    renderer: SectionItemRenderer,
    controls: ItemControls,
  },
  link: {
    renderer: LinkItemRenderer,
    controls: ItemControls,
  },
};
