import type { PageItemLinkMetadata } from "@grabbin/api";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { GridItemShell } from "@/components/handle/grid/grid-item-shell";
import { ItemRenderer } from "@/components/handle/grid/item-renderer";
import {
  type GridItemCommandHandler,
  getItemCapabilities,
} from "@/lib/grid/item-registry";
import type {
  GridItem,
  GridItemByType,
  ItemLayout,
  ItemType,
  PresetName,
} from "@/lib/grid/types";
import { GITHUB_CONTRIBUTION_GRAPH } from "./github-contribution-graph";

const FEATURE_LINK_METADATA = {
  github: {
    title: "Example GitHub project",
    description: "A project link on your page.",
    faviconUrl: "https://cdn.grabbin.me/assets/link-provider-icon/github.svg",
    provider: "github",
    providerData: {
      followers: 10006,
      githubContributionGraph: GITHUB_CONTRIBUTION_GRAPH,
    },
  },
  instagram: {
    title: "Example photo profile",
    description: "A photo profile link on your page.",
    faviconUrl:
      "https://cdn.grabbin.me/assets/link-provider-icon/instagram.svg",
    provider: "instagram",
    providerData: {
      followerCount: 2000000,
      followerCountLabel: "2M",
      followerCountApproximate: true,
    },
  },
  youtube: {
    title: "Example video channel",
    description: "A video channel link on your page.",
    faviconUrl: "https://cdn.grabbin.me/assets/link-provider-icon/youtube.svg",
    provider: "youtube",
    providerData: {
      subscriberCount: 12900000,
    },
  },
} as const satisfies Record<string, PageItemLinkMetadata>;

const noopGridCommand: GridItemCommandHandler = () => undefined;

export function RichContentPreview({
  mapboxAccessToken,
}: {
  mapboxAccessToken?: string;
}) {
  const items = useMemo(createEverythingPreviewItems, []);

  return (
    <div className="relative size-full overflow-visible rounded-2xl bg-background">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          maskImage:
            "radial-gradient(ellipse at center, #000 72%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, #000 72%, transparent 100%)",
        }}
      >
        <div
          className="[--preview-row:49px] [--preview-gap:24px] md:[--preview-row:68px] md:[--preview-gap:36px]"
          style={
            {
              "--preview-small":
                "calc(var(--preview-row) * 2 + var(--preview-gap))",
              "--preview-wide":
                "calc(var(--preview-small) * 2 + var(--preview-gap))",
              "--preview-edge-inset": "0px",
              "--preview-item-gap": "var(--preview-gap)",
              boxSizing: "border-box",
              padding: "8px",
              width:
                "calc(var(--preview-small) * 5 + var(--preview-gap) * 4 - var(--preview-edge-inset) * 2 + 16px)",
              height:
                "calc(var(--preview-wide) + var(--preview-gap) + var(--preview-small) + 16px)",
            } as CSSProperties
          }
        >
          <div className="relative size-full">
            {items.map((item) => (
              <EverythingPreviewItem
                key={item.id}
                item={item}
                mapboxAccessToken={mapboxAccessToken}
                className={
                  item.id === "everything-map"
                    ? "max-md:!bottom-auto max-md:!left-1/2 max-md:!right-auto max-md:!top-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2"
                    : "max-md:hidden"
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const EVERYTHING_PREVIEW_POSITIONS = {
  "everything-media": {
    left: "calc(-1 * var(--preview-edge-inset))",
    top: "calc(var(--preview-wide) + var(--preview-item-gap))",
    width: "var(--preview-wide)",
    height: "var(--preview-small)",
    zIndex: 1,
  },
  "everything-media-portrait": {
    left: "calc(var(--preview-wide) - var(--preview-small) - var(--preview-edge-inset))",
    top: "0",
    width: "var(--preview-small)",
    height: "var(--preview-wide)",
    zIndex: 2,
  },
  "everything-github": {
    left: "calc(var(--preview-wide) - var(--preview-edge-inset) + var(--preview-item-gap))",
    top: "calc(var(--preview-small) + var(--preview-item-gap))",
    width: "var(--preview-small)",
    height: "var(--preview-wide)",
    zIndex: 3,
  },
  "everything-instagram": {
    left: "calc(var(--preview-wide) - var(--preview-edge-inset) + var(--preview-item-gap))",
    top: "0",
    width: "var(--preview-small)",
    height: "var(--preview-small)",
    zIndex: 4,
  },
  "everything-youtube": {
    left: "0",
    top: "calc(var(--preview-wide) - var(--preview-small))",
    width: "var(--preview-small)",
    height: "var(--preview-small)",
    zIndex: 2,
  },
  "everything-map": {
    right: "var(--preview-edge-inset)",
    top: "calc(var(--preview-small) + var(--preview-item-gap))",
    width: "var(--preview-wide)",
    height: "var(--preview-wide)",
    zIndex: 5,
  },
  "everything-text": {
    right: "var(--preview-edge-inset)",
    top: "calc(var(--preview-row) + var(--preview-item-gap))",
    width: "var(--preview-wide)",
    height: "var(--preview-row)",
    zIndex: 6,
  },
} as const satisfies Record<
  string,
  {
    top: string;
    left?: string;
    right?: string;
    height: string;
    width: string;
    zIndex: number;
  }
>;

const EVERYTHING_PREVIEW_ITEM_LAYOUTS: Record<PresetName, ItemLayout> = {
  halfBanner: { x: 0, y: 0, w: 2, h: 1 },
  squareSmall: { x: 0, y: 0, w: 1, h: 2 },
  landscape: { x: 0, y: 0, w: 2, h: 2 },
  squareLarge: { x: 0, y: 0, w: 2, h: 4 },
  portrait: { x: 0, y: 0, w: 1, h: 4 },
  fullBanner: { x: 0, y: 0, w: 4, h: 1 },
};

const EVERYTHING_PREVIEW_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function createEverythingPreviewItem<T extends ItemType>({
  id,
  type,
  preset,
  data,
}: {
  id: string;
  type: T;
  preset: PresetName;
  data: GridItemByType<T>["data"];
}): GridItemByType<T> {
  const layout = EVERYTHING_PREVIEW_ITEM_LAYOUTS[preset];

  return {
    id,
    type,
    style: {},
    data,
    layouts: { wide: layout, compact: layout },
    createdAt: EVERYTHING_PREVIEW_TIMESTAMP,
    updatedAt: EVERYTHING_PREVIEW_TIMESTAMP,
    preset,
  } as GridItemByType<T>;
}

function createEverythingPreviewItems(): GridItem[] {
  const items: GridItem[] = [];
  const add = <T extends GridItem>(item: T) => {
    items.push(item);
    return item;
  };

  add(
    createEverythingPreviewItem({
      id: "everything-media",
      type: "media",
      preset: "landscape",
      data: {
        objectKey: "feature-preview-media",
        mimeType: "image/jpeg",
        mediaUrl: "https://cdn.grabbin.me/assets/features/4.jpg",
      },
    }),
  );

  add(
    createEverythingPreviewItem({
      id: "everything-map",
      type: "map",
      preset: "squareLarge",
      data: {
        latitude: 40.7128,
        longitude: -74.006,
        zoom: 10,
        caption: "New York",
      },
    }),
  );

  add(
    createEverythingPreviewItem({
      id: "everything-media-portrait",
      type: "media",
      preset: "portrait",
      data: {
        objectKey: "feature-preview-media-portrait",
        mimeType: "video/webm",
        mediaUrl: "https://cdn.grabbin.me/assets/features/3.webm",
      },
    }),
  );

  add(
    createEverythingPreviewItem({
      id: "everything-text",
      type: "text",
      preset: "halfBanner",
      data: { text: "Everything in one place." },
    }),
  );

  for (const link of [
    {
      id: "everything-github",
      preset: "portrait" as const,
      url: "https://github.com/example",
      metadata: { ...FEATURE_LINK_METADATA.github, title: "GitHub" },
    },
    {
      id: "everything-instagram",
      preset: "squareSmall" as const,
      url: "https://www.instagram.com/example",
      metadata: { ...FEATURE_LINK_METADATA.instagram, title: "Instagram" },
    },
    {
      id: "everything-youtube",
      preset: "squareSmall" as const,
      url: "https://www.youtube.com/@example",
      metadata: { ...FEATURE_LINK_METADATA.youtube, title: "YouTube" },
    },
  ] as const) {
    add(
      createEverythingPreviewItem({
        id: link.id,
        type: "link",
        preset: link.preset,
        data: {
          url: link.url,
          metadata: link.metadata,
        },
      }),
    );
  }

  return items;
}

function EverythingPreviewItem({
  item,
  mapboxAccessToken,
  className,
}: {
  item: GridItem;
  mapboxAccessToken?: string;
  className?: string;
}) {
  const position =
    EVERYTHING_PREVIEW_POSITIONS[
      item.id as keyof typeof EVERYTHING_PREVIEW_POSITIONS
    ];
  const preset = item.preset;
  if (!position || !preset) return null;

  const capabilities = getItemCapabilities(item, {
    breakpoint: "wide",
    mode: "view",
  });

  return (
    <div className={`absolute ${className ?? ""}`} style={position}>
      <GridItemShell
        item={item}
        capabilities={capabilities}
        onCommand={noopGridCommand}
      >
        <ItemRenderer
          item={item}
          breakpoint="wide"
          preset={preset}
          mode="view"
          mapboxAccessToken={mapboxAccessToken}
          onCommand={noopGridCommand}
        />
      </GridItemShell>
    </div>
  );
}
