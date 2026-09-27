import CtaSection from "@/components/landing/cta-section";
import DemoSection from "@/components/landing/demo-section";
import HeroSection from "@/components/landing/hero-section";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import LandingHeader from "@/components/landing/landing-header";
import PlanSection from "@/components/landing/plan-section";
import WidgetTypesSection from "@/components/landing/widget-types-section";
import Footer from "@/components/layout/footer";

export default function Home() {
	return (
		<>
			<main className="landing-page flex flex-col items-center justify-center font-aspekta">
				<LandingHeader />
				<HeroSection />
				<DemoSection />
				<WidgetTypesSection />
				<PlanSection
					joinButton={
						<JoinForFreeButton
							variant="brandBlack"
							className="mt-auto h-12 w-full rounded-lg text-lg"
						/>
					}
				/>
				<CtaSection />
			</main>
			<Footer />
		</>
	);
}
