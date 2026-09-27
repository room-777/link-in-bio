import JoinForFreeButton from "@/components/landing/join-for-free-button";
import LandingHeaderBackground from "@/components/landing/landing-header-background";
import Logo from "@/components/logo";

export default function LandingHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-100003 w-full px-3 py-4 sm:px-6 sm:py-4">
			<LandingHeaderBackground />
			<div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between">
				<Logo className="size-10 shrink-0" />
				<div className="flex justify-end">
					<div className="flex flex-row items-center gap-2 sm:gap-2">
						<JoinForFreeButton
							variant="brandBlack"
							size="lg"
							className="h-10 w-auto shrink-0 px-4 text-sm sm:h-10 sm:text-base"
						/>
					</div>
				</div>
			</div>
		</header>
	);
}
