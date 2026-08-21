import type { Metadata } from "next";
import { PublicHandlePageClient } from "@/components/handle/public-handle-page-client";
import { env } from "@/lib/env";
import {
  getPublicPageDescription,
  getPublicPageTitle,
} from "@/lib/handle/public-page-copy";
import { createProfilePageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";
import { getPublicImageUrl } from "@/lib/seo-responses";
import { getPageByHandle } from "@/lib/server/page-queries";
import {
  getPublicHandleModel,
  requirePublicHandleModel,
} from "@/lib/server/public-handle-model";
import { SimpleAnalyticsTracker } from "@/lib/simple-analytics-tracker";

type RouteProps = {
  params: Promise<{ handle: string }>;
};

function getPageImage(model: Awaited<ReturnType<typeof getPublicHandleModel>>) {
  return model
    ? (getPublicImageUrl(model.page.image, model.page.updatedAt) ??
        DEFAULT_SOCIAL_IMAGE)
    : DEFAULT_SOCIAL_IMAGE;
}

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { handle } = await params;
  const result = await getPageByHandle(handle);
  if (!result.ok) {
    if (result.response.status === 404) return {};
    throw new Error(
      `Failed to load public page metadata: ${result.response.status}`,
    );
  }

  const page = result.data.page;
  const title = getPublicPageTitle(page);
  const description = getPublicPageDescription(page);
  const path = `/${encodeURIComponent(page.handle)}`;
  const image = getPublicImageUrl(page.image, page.updatedAt);
  const openGraphImage = `${path}/opengraph-image`;

  return {
    ...createMetadata({
      title,
      description,
      canonicalPath: path,
      includeSiteName: false,
      image: openGraphImage,
    }),
    icons: {
      icon: [
        {
          url: image
            ? `/api/favicon?image=${encodeURIComponent(image)}&version=2`
            : "/icon.svg",
          type: "image/svg+xml",
          sizes: "64x64",
        },
      ],
    },
  };
}

export default async function PublicHandlePage({ params }: RouteProps) {
  const { handle } = await params;
  const model = requirePublicHandleModel(await getPublicHandleModel(handle));
  const title = getPublicPageTitle(model.page);
  const description = getPublicPageDescription(model.page);
  const path = `/${encodeURIComponent(model.page.handle)}`;
  const siteOrigin = env.NEXT_PUBLIC_APP_URL;
  const imageBaseUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() || null;
  const mapboxAccessToken =
    env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || undefined;

  return (
    <>
      <SimpleAnalyticsTracker pageId={model.page.id} />
      <script type="application/ld+json">
        {JSON.stringify(
          createProfilePageJsonLd({
            title,
            handle: model.page.handle,
            description,
            path,
            image: getPageImage(model),
          }),
        )}
      </script>
      <PublicHandlePageClient
        apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
        model={model}
        imageUrl={getPublicImageUrl(model.page.image, model.page.updatedAt)}
        imageBaseUrl={imageBaseUrl}
        mapboxAccessToken={mapboxAccessToken}
        siteOrigin={siteOrigin}
      />
    </>
  );
}
