import CtaSection from "@/components/landing/cta-section";
import DemoSection from "@/components/landing/demo-section";
import HeroSection from "@/components/landing/hero-section";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import PlanSection from "@/components/landing/plan-section";
import WidgetTypesSection from "@/components/landing/widget-types-section";
import { getServerSession } from "@/lib/server/session";

export default async function Home() {
	const session = await getServerSession();

	return (
		<>
			<main className="landing-page flex flex-col items-center justify-center font-sans">
				<HeroSection />
				<DemoSection />
				<WidgetTypesSection />
				<PlanSection
					isAuthenticated={Boolean(session)}
					joinButton={
						<JoinForFreeButton
							variant="brandBlack"
							className="mt-auto h-12 w-full rounded-lg text-lg"
						/>
					}
				/>
				<CtaSection />
			</main>
		</>
	);
}
