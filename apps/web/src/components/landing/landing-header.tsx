import JoinForFreeButton from "@/components/landing/join-for-free-button";
import Logo from "@/components/logo";

export default function LandingHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-100003 px-3 py-2 sm:px-10">
			<div className="relative mx-auto flex w-full items-center justify-between rounded-full px-2 py-2 pl-4">
				<Logo className="relative z-10 size-8 shrink-0" />
				<JoinForFreeButton
					variant="brandBlack"
					size="lg"
					className="relative z-10 h-10 w-auto shrink-0 rounded-lg px-6 text-base"
				/>
			</div>
		</header>
	);
}
