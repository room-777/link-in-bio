import type { LinkProviderId } from "@grabbin/api";
import type { CSSProperties } from "react";

export type ConfiguredLinkProviderId = Exclude<
  LinkProviderId,
  "mailto" | "generic-web" | "notion"
>;

export type LinkProviderPresentation = {
  cardBackground: string;
  actionBackground: string;
  actionText: string;
  actionLabel: string;
  actionVariant: "solid" | "outline";
};

export const linkProviderPresentation = {
  youtube: {
    cardBackground: "#fff2f5",
    actionBackground: "#ff0033",
    actionText: "#ffffff",
    actionLabel: "Watch",
    actionVariant: "solid",
  },
  "youtube-music": {
    cardBackground: "#fff2f5",
    actionBackground: "#ff0033",
    actionText: "#ffffff",
    actionLabel: "Listen",
    actionVariant: "solid",
  },
  discord: {
    cardBackground: "#f2f3ff",
    actionBackground: "#5865f2",
    actionText: "#ffffff",
    actionLabel: "Join",
    actionVariant: "solid",
  },
  github: {
    cardBackground: "#ffffff",
    actionBackground: "#f6f8fa",
    actionText: "#000000",
    actionLabel: "Follow",
    actionVariant: "outline",
  },
  x: {
    cardBackground: "#f7f7f7",
    actionBackground: "#000000",
    actionText: "#ffffff",
    actionLabel: "Follow",
    actionVariant: "solid",
  },
  spotify: {
    cardBackground: "#f0fbf4",
    actionBackground: "#1ED760",
    actionText: "#ffffff",
    actionLabel: "Play",
    actionVariant: "solid",
  },
  "app-store": {
    cardBackground: "#EAF4FF",
    actionBackground: "#007AFF",
    actionText: "#FFFFFF",
    actionLabel: "Download",
    actionVariant: "solid",
  },
  "google-play": {
    cardBackground: "#FFFFFF",
    actionBackground: "#F6F8FA",
    actionText: "#000000",
    actionLabel: "Get it",
    actionVariant: "outline",
  },
  threads: {
    cardBackground: "#ffffff",
    actionBackground: "#000000",
    actionText: "#ffffff",
    actionLabel: "Follow",
    actionVariant: "solid",
  },
  instagram: {
    cardBackground: "#ffffff",
    actionBackground: "#3797f0",
    actionText: "#ffffff",
    actionLabel: "Follow",
    actionVariant: "solid",
  },
  "buy-me-a-coffee": {
    cardBackground: "#fffbe5",
    actionBackground: "#ffdd00",
    actionText: "#000000",
    actionLabel: "Support",
    actionVariant: "solid",
  },
  linkedin: {
    cardBackground: "#f0f7ff",
    actionBackground: "#0a66c2",
    actionText: "#ffffff",
    actionLabel: "Connect",
    actionVariant: "solid",
  },
  chzzk: {
    cardBackground: "#ffffff",
    actionBackground: "#000000",
    actionText: "#ffffff",
    actionLabel: "Watch",
    actionVariant: "solid",
  },
  figma: {
    cardBackground: "#ffffff",
    actionBackground: "#1769ff",
    actionText: "#ffffff",
    actionLabel: "Open",
    actionVariant: "solid",
  },
  "ko-fi": {
    cardBackground: "#eefaff",
    actionBackground: "#29abe0",
    actionText: "#ffffff",
    actionLabel: "Support",
    actionVariant: "solid",
  },
  gumroad: {
    cardBackground: "#fff2fc",
    actionBackground: "#ff90e8",
    actionText: "#000000",
    actionLabel: "Get it",
    actionVariant: "solid",
  },
  medium: {
    cardBackground: "#ffffff",
    actionBackground: "#000000",
    actionText: "#ffffff",
    actionLabel: "Read",
    actionVariant: "solid",
  },
  patreon: {
    cardBackground: "#ffffff",
    actionBackground: "#71a0ff",
    actionText: "#ffffff",
    actionLabel: "Join",
    actionVariant: "solid",
  },
  "product-hunt": {
    cardBackground: "#fff4f0",
    actionBackground: "#da552f",
    actionText: "#ffffff",
    actionLabel: "View",
    actionVariant: "solid",
  },
  reddit: {
    cardBackground: "#fff2ed",
    actionBackground: "#ff4500",
    actionText: "#ffffff",
    actionLabel: "Join",
    actionVariant: "solid",
  },
  tiktok: {
    cardBackground: "#ffffff",
    actionBackground: "#000000",
    actionText: "#ffffff",
    actionLabel: "Watch",
    actionVariant: "solid",
  },
  twitch: {
    cardBackground: "#f7f2ff",
    actionBackground: "#9146ff",
    actionText: "#ffffff",
    actionLabel: "Watch",
    actionVariant: "solid",
  },
  behance: {
    cardBackground: "#f0f5ff",
    actionBackground: "#1769ff",
    actionText: "#ffffff",
    actionLabel: "Follow",
    actionVariant: "solid",
  },
  dribbble: {
    cardBackground: "#fff2f7",
    actionBackground: "#ea4c89",
    actionText: "#ffffff",
    actionLabel: "Follow",
    actionVariant: "solid",
  },
} satisfies Record<ConfiguredLinkProviderId, LinkProviderPresentation>;

export function getConfiguredLinkProviderPresentation(
  provider: LinkProviderId,
): LinkProviderPresentation | undefined {
  if (!(provider in linkProviderPresentation)) return undefined;
  return linkProviderPresentation[provider as ConfiguredLinkProviderId];
}

export function getLinkCardThemeStyle(
  provider: LinkProviderId,
): CSSProperties | undefined {
  const presentation = getConfiguredLinkProviderPresentation(provider);
  if (!presentation) return undefined;
  return {
    backgroundColor: presentation.cardBackground,
    "--link-card-background": presentation.cardBackground,
  } as CSSProperties;
}
