import CtaSection from "@/components/landing/cta-section";
import DemoSection from "@/components/landing/demo-section";
import HeroSection from "@/components/landing/hero-section";
import LandingHeader from "@/components/landing/landing-header";
import Footer from "@/components/layout/footer";

export default function Home() {
	return (
		<>
			<main className="landing-page flex flex-col items-center justify-center font-aspekta">
				<LandingHeader />
				<HeroSection />
				<DemoSection />
				<CtaSection />
			</main>
			<Footer />
		</>
	);
}
