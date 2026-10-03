import type { Metadata } from "next";
import CtaSection from "@/components/landing/cta-section";
import DemoSection from "@/components/landing/demo-section";
import HeroSection from "@/components/landing/hero-section";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import PlanSection from "@/components/landing/plan-section";
import WidgetTypesSection from "@/components/landing/widget-types-section";

export const revalidate = false;

const title = "A visual personal website for your work | Grabbin";
const description =
	"Create a personal website that brings your story, work, and content together. Build a polished bento page with flexible widgets and make your link in bio feel like your own corner of the web.";

export const metadata: Metadata = {
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

export default function Home() {
	return (
		<>
			<main className="landing-page flex flex-col items-center justify-center font-sans">
				<HeroSection />
				<DemoSection />
				<WidgetTypesSection />
				<PlanSection
					joinButton={
						<JoinForFreeButton
							variant="brandBlack"
							className="h-12 w-full rounded-lg text-lg"
						/>
					}
				/>
				<CtaSection />
			</main>
		</>
	);
}
