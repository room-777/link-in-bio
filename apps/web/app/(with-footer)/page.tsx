import CTASection from "@/components/landing/cta-section";
import FeatureSection from "@/components/landing/feature-section";
import HeroSection from "@/components/landing/hero-section";
import PlanSection from "@/components/landing/plan-section";
import JsonLd from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { createWebPageJsonLd, createWebSiteJsonLd } from "@/lib/seo/json-ld";
import {
  createHomeMetadata,
  DEFAULT_SEO_DESCRIPTION,
  HOME_TITLE,
} from "@/lib/seo/metadata";

export const metadata = createHomeMetadata();

const homeJsonLd = [
  createWebSiteJsonLd({
    name: "Grabbin",
    description: DEFAULT_SEO_DESCRIPTION,
    path: "/",
  }),
  createWebPageJsonLd({
    title: HOME_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    path: "/",
  }),
];

export default function Home() {
  const mapboxAccessToken =
    env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || undefined;

  return (
    <>
      <JsonLd nodes={homeJsonLd} />
      <main>
        <div className="flex min-h-lvh flex-col">
          <section className="flex-1 px-5 pb-16">
            <HeroSection />
            <FeatureSection mapboxAccessToken={mapboxAccessToken} />
            <PlanSection />
            <div>
              <CTASection />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
