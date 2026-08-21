import type { Metadata } from "next";
import FeatureSection from "@/components/landing/feature-section";
import PlanSection from "@/components/landing/plan-section";
import JsonLd from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";

const PRICING_TITLE = "Simple Grabbin plans for creators";
const PRICING_DESCRIPTION =
  "Compare simple plans for creating a beautiful link in bio page with your links, media, and favorite places.";

export const metadata: Metadata = createMetadata({
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  canonicalPath: "/pricing",
  image: DEFAULT_SOCIAL_IMAGE,
  keywords: ["link in bio pricing", "creator page", "personal page"],
});

const pricingJsonLd = createWebPageJsonLd({
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  path: "/pricing",
});

export default function PricingPage() {
  const mapboxAccessToken =
    env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || undefined;

  return (
    <>
      <JsonLd nodes={[pricingJsonLd]} />
      <main className="px-5 pb-16">
        <PlanSection />
        <FeatureSection mapboxAccessToken={mapboxAccessToken} />
      </main>
    </>
  );
}
