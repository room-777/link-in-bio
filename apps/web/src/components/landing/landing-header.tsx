import JoinForFreeButton from "@/components/landing/join-for-free-button";
import LandingHeaderBackground from "@/components/landing/landing-header-background";
import Logo from "@/components/logo";

export default function LandingHeader() {
	return (
		<LandingHeaderBackground>
			<Logo className="relative z-10 size-8 shrink-0" />
			<JoinForFreeButton
				variant="brand"
				size="lg"
				className="relative z-10 h-9 w-auto shrink-0 rounded-2xl px-3 text-sm"
			/>
		</LandingHeaderBackground>
	);
}
