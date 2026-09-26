import { Button } from "@grabbin/ui/components/button";
import JoinForFreeButton from "@/components/landing/join-for-free-button";
import LandingHeaderBackground from "@/components/landing/landing-header-background";

function Logo({ className }: { className?: string }) {
	return (
		<div
			className={`flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}
		>
			<svg
				viewBox="0 0 48 48"
				role="img"
				aria-label="Grabbin"
				className="size-10"
				fill="white"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			>
				<rect
					x="5"
					y="9"
					width="23"
					height="31"
					rx="3"
					transform="rotate(-24 16.5 24.5)"
				/>
				<rect
					x="20"
					y="9"
					width="23"
					height="31"
					rx="3"
					transform="rotate(24 31.5 24.5)"
				/>
				<rect x="13" y="5" width="23" height="31" rx="3" />
			</svg>
		</div>
	);
}

export default function LandingHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-[100003] w-full px-3 py-4 sm:px-6 sm:py-4">
			<LandingHeaderBackground />
			<div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between">
				<Logo className="shrink-0" />
				<div className="flex justify-end">
					<div className="flex flex-row items-center gap-2 sm:gap-2">
						<JoinForFreeButton
							variant="brandBlack"
							size="lg"
							className="h-10 w-auto shrink-0 px-4 text-sm sm:h-10 sm:text-base"
						/>
						<Button
							render={<a href="#demo" />}
							variant="outline"
							size="lg"
							className="h-10 w-auto shrink-0 px-4 text-sm sm:h-10 sm:text-base"
						>
							Try demo
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
