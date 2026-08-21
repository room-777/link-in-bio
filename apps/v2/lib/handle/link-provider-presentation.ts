import type { LinkProviderId } from "@grabbin/api";
import type { CSSProperties } from "react";

type LinkProviderPresentation = {
  cardBackground: string;
  actionBackground: string;
  actionText: string;
  actionLabel: string;
  actionVariant: "solid" | "outline";
};

const presentations = {
  youtube: ["#fff2f5", "#ff0033", "#ffffff", "Watch", "solid"],
  "youtube-music": ["#fff2f5", "#ff0033", "#ffffff", "Listen", "solid"],
  discord: ["#f2f3ff", "#5865f2", "#ffffff", "Join", "solid"],
  github: ["#ffffff", "#f6f8fa", "#000000", "Follow", "outline"],
  x: ["#f7f7f7", "#000000", "#ffffff", "Follow", "solid"],
  spotify: ["#f0fbf4", "#1ed760", "#ffffff", "Play", "solid"],
  "app-store": ["#eaf4ff", "#007aff", "#ffffff", "Download", "solid"],
  "google-play": ["#ffffff", "#f6f8fa", "#000000", "Get it", "outline"],
  threads: ["#ffffff", "#000000", "#ffffff", "Follow", "solid"],
  instagram: ["#ffffff", "#3797f0", "#ffffff", "Follow", "solid"],
  "buy-me-a-coffee": ["#fffbe5", "#ffdd00", "#000000", "Support", "solid"],
  linkedin: ["#f0f7ff", "#0a66c2", "#ffffff", "Connect", "solid"],
  chzzk: ["#ffffff", "#000000", "#ffffff", "Watch", "solid"],
  figma: ["#ffffff", "#1769ff", "#ffffff", "Open", "solid"],
  "ko-fi": ["#eefaff", "#29abe0", "#ffffff", "Support", "solid"],
  gumroad: ["#fff2fc", "#ff90e8", "#000000", "Get it", "solid"],
  medium: ["#ffffff", "#000000", "#ffffff", "Read", "solid"],
  patreon: ["#ffffff", "#71a0ff", "#ffffff", "Join", "solid"],
  "product-hunt": ["#fff4f0", "#da552f", "#ffffff", "View", "solid"],
  reddit: ["#fff2ed", "#ff4500", "#ffffff", "Join", "solid"],
  tiktok: ["#ffffff", "#000000", "#ffffff", "Watch", "solid"],
  twitch: ["#f7f2ff", "#9146ff", "#ffffff", "Watch", "solid"],
  behance: ["#f0f5ff", "#1769ff", "#ffffff", "Follow", "solid"],
  dribbble: ["#fff2f7", "#ea4c89", "#ffffff", "Follow", "solid"],
} as const satisfies Record<
  Exclude<LinkProviderId, "mailto" | "generic-web" | "notion">,
  readonly [string, string, string, string, "solid" | "outline"]
>;

export function getLinkProviderTheme(provider: LinkProviderId) {
  if (!(provider in presentations)) return undefined;
  const [
    cardBackground,
    actionBackground,
    actionText,
    actionLabel,
    actionVariant,
  ] = presentations[provider as keyof typeof presentations];
  return {
    cardBackground,
    actionBackground,
    actionText,
    actionLabel,
    actionVariant,
  } satisfies LinkProviderPresentation;
}

export function getLinkCardThemeStyle(
  provider: LinkProviderId,
): CSSProperties | undefined {
  const theme = getLinkProviderTheme(provider);
  return theme
    ? ({
        backgroundColor: theme.cardBackground,
        "--link-card-background": theme.cardBackground,
      } as CSSProperties)
    : undefined;
}
