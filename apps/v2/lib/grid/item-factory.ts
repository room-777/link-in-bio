import { createInitialLinkMetadata } from "@grabbin/api";
import {
  getColumns,
  getDefaultPreset,
  getPresetGeometry,
  placeAtFirstAvailable,
} from "@grabbin/grid-layout";
import { DEFAULT_MAP_LOCATION, DEFAULT_MAP_ZOOM } from "../map/map-config";
import { toLayoutMap } from "./layout-engine";
import type { Breakpoint, GridItem, ItemType } from "./types";

const breakpoints: Breakpoint[] = ["wide", "compact"];

function createGridItemId() {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [...bytes]
    .map((byte, index) => {
      const value = byte.toString(16).padStart(2, "0");
      return [4, 6, 8, 10].includes(index) ? `-${value}` : value;
    })
    .join("");
}

export function createGridItem({
  items,
  itemType,
  url,
  media,
}: {
  items: readonly GridItem[];
  itemType: ItemType;
  url?: string;
  media?: { mimeType: string; previewUrl: string };
}): GridItem {
  const id = createGridItemId();
  const preset = getDefaultPreset(itemType);
  const layouts = Object.fromEntries(
    breakpoints.map((breakpoint) => [
      breakpoint,
      placeAtFirstAvailable(
        toLayoutMap(items, breakpoint),
        getPresetGeometry(preset, breakpoint),
        getColumns(breakpoint),
      ),
    ]),
  ) as GridItem["layouts"];
  const now = new Date().toISOString();
  const base = {
    id,
    style: {},
    layouts,
    createdAt: now,
    updatedAt: now,
    preset,
  };

  switch (itemType) {
    case "text":
      return { ...base, type: itemType, data: { text: "" } };
    case "media":
      return {
        ...base,
        type: itemType,
        data: {
          objectKey: "pending",
          mimeType: media?.mimeType ?? "image/jpeg",
          mediaUrl: media?.previewUrl,
        },
      };
    case "map":
      return {
        ...base,
        type: itemType,
        data: {
          ...DEFAULT_MAP_LOCATION,
          zoom: DEFAULT_MAP_ZOOM,
        },
      };
    case "section":
      return { ...base, type: itemType, data: { title: "" } };
    case "link":
      return {
        ...base,
        type: itemType,
        data: {
          url: url ?? "https://example.com",
          metadata: createInitialLinkMetadata(url ?? "https://example.com"),
        },
      };
  }
}
