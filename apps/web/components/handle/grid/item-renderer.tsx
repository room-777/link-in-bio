import type {
  ItemRendererProps,
  ItemRendererView,
} from "@/lib/grid/item-registry";
import {
  getItemCapabilities,
  getItemViewRegistration,
} from "@/lib/grid/item-registry";
import type { GridItem, ItemType } from "@/lib/grid/types";

export function ItemRenderer(props: ItemRendererProps<GridItem>) {
  const capabilities =
    props.capabilities ??
    getItemCapabilities(props.item, {
      breakpoint: props.breakpoint,
      mode: props.mode,
    });

  if (!capabilities.canRender) {
    return null;
  }

  const view = getItemViewRegistration(props.item).renderer as ItemRendererView<
    Extract<GridItem, { type: ItemType }>
  >;

  const View = view;
  return <View {...props} />;
}
