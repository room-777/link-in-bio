import HeroSection from "@/components/landing/hero-section";
import LandingHeader from "@/components/landing/landing-header";
import Footer from "@/components/layout/footer";

export default function Home() {
	return (
		<main className="flex flex-col items-center justify-center font-aspekta">
			<LandingHeader />
			<HeroSection />
			<Footer />
		</main>
	);
}
