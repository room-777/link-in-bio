import type { Metadata } from "next";
import { PublicHandlePageClient } from "@/components/handle/public-handle-page-client";
import { getDemoPage } from "@/lib/demo/demo-page";
import { env } from "@/lib/env";
import {
  getPublicPageDescription,
  getPublicPageTitle,
} from "@/lib/handle/public-page-copy";
import { createMetadata, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";
import { getPublicImageUrl } from "@/lib/seo-responses";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";

export const dynamic = "force-static";

const demoPage = getDemoPage();
const demoModel = {
  page: demoPage.page,
  items: demoPage.items,
  visitorsEnabled: false,
  isSignedIn: false,
  isCurrentUserPage: true,
  isPrimaryPage: false,
  entitlements: {
    tier: "free",
    hasAccess: false,
  },
  readOnly: false,
  mode: "edit",
  isDemo: true,
} satisfies PublicHandleModel;

export function generateMetadata(): Metadata {
  const title = getPublicPageTitle(demoModel.page);
  const description = getPublicPageDescription(demoModel.page);
  const image =
    getPublicImageUrl(demoModel.page.image, demoModel.page.updatedAt) ??
    DEFAULT_SOCIAL_IMAGE;

  return createMetadata({
    title,
    description,
    canonicalPath: "/demo",
    includeSiteName: false,
    image,
  });
}

export default function DemoPage() {
  const imageUrl = getPublicImageUrl(
    demoModel.page.image,
    demoModel.page.updatedAt,
  );
  const imageBaseUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() || null;
  const mapboxAccessToken =
    env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || undefined;

  return (
    <PublicHandlePageClient
      apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
      imageUrl={imageUrl}
      imageBaseUrl={imageBaseUrl}
      mapboxAccessToken={mapboxAccessToken}
      model={demoModel}
      siteOrigin={env.NEXT_PUBLIC_APP_URL}
    />
  );
}
