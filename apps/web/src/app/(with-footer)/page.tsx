import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import CtaSection from "@/components/landing/cta-section";
import FeatureSection from "@/components/landing/feature-section";
import HeroSection from "@/components/landing/hero-section";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import PlanSection from "@/components/landing/plan-section";
import WidgetTypesSection from "@/components/landing/widget-types-section";
import HandlePage from "@/components/page/public/handle-page";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getCustomDomainHostname } from "@/lib/custom-domain-host";
import { getPageImageUrl } from "@/lib/page-image-url";
import { getServerApiClient } from "@/lib/server/api-client";
import { fetchPage } from "@/lib/server/page-query";

export const revalidate = false;

const title = "A visual personal website for your work | Grabbin";
const description =
	"Build a visual personal website and link-in-bio page for your work, with photos, videos, text, links, and places in one flexible layout.";

const landingMetadata: Metadata = {
	title,
	alternates: { canonical: "/" },
	openGraph: {
		title,
		description,
		url: "/",
		siteName: "Grabbin",
		type: "website",
		images: ["/opengraph-image.png"],
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
		images: ["/opengraph-image.png"],
	},
};

const getDomainPage = cache(async (hostname: string) => {
	const client = getServerApiClient() ?? apiClient;
	const response = await client.pages.domain[":hostname"].$get({
		param: { hostname },
	});

	if (response.status === 404 || response.status === 422) return null;

	if (!response.ok) throw new Error(await getApiErrorMessage(response));

	const result = await response.json();

	if (!("handle" in result)) throw new Error("Could not find this page.");

	return fetchPage(result.handle);
});

async function getRequestDomainPage() {
	const requestHeaders = await headers();
	const hostname = getCustomDomainHostname(requestHeaders.get("host"));
	return hostname ? getDomainPage(hostname) : null;
}

export async function generateMetadata(): Promise<Metadata> {
	const hostname = getCustomDomainHostname((await headers()).get("host"));
	const pageResponse = await getRequestDomainPage();

	if (!pageResponse) return landingMetadata;

	const { page } = pageResponse;
	const title = page.name?.trim() || `@${page.handle}`;
	const bio = page.bio?.trim();
	const hasPlaceholderBio = Boolean(bio && /\blorem ipsum\b/i.test(bio));
	const description =
		bio && !/\blorem ipsum\b/i.test(bio)
			? `Explore ${title}'s page on Grabbin: ${bio}`.slice(0, 160)
			: `Explore ${title}'s links, photos, social profiles, and favorite places on Grabbin.`;
	const image = getPageImageUrl(page.imageSource ?? page.imageKey, {
		width: 1200,
		height: 630,
		format: "png",
	});
	const icon = getPageImageUrl(page.imageSource ?? page.imageKey, {
		width: 64,
		height: 64,
		format: "png",
	});
	const appleIcon = getPageImageUrl(page.imageSource ?? page.imageKey, {
		width: 180,
		height: 180,
		format: "png",
	});

	return {
		title,
		description,
		alternates: { canonical: hostname ? `https://${hostname}/` : "/" },
		robots: hasPlaceholderBio ? { index: false, follow: true } : undefined,
		openGraph: {
			title,
			description,
			url: hostname ? `https://${hostname}/` : "/",
			siteName: "Grabbin",
			type: "website",
			images: image ? [image] : undefined,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: image ? [image] : undefined,
		},
		icons: icon
			? {
					icon: { url: icon, type: "image/png", sizes: "64x64" },
					apple: appleIcon
						? { url: appleIcon, type: "image/png", sizes: "180x180" }
						: undefined,
				}
			: undefined,
	};
}

export default async function Home() {
	const pageResponse = await getRequestDomainPage();
	if (pageResponse) return <HandlePage pageResponse={pageResponse} />;

	const hostname = getCustomDomainHostname((await headers()).get("host"));
	if (hostname) notFound();

	return (
		<main className="landing-page flex flex-col items-center justify-center font-sans">
			<HeroSection />
			<WidgetTypesSection />
			<FeatureSection
				joinButton={
					<JoinForFreeButton
						variant="brandBlack"
						className="h-12 w-full max-w-sm rounded-lg text-lg"
					/>
				}
			/>
			<PlanSection />
			<CtaSection />
		</main>
	);
}
