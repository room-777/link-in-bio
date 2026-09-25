import { Button } from "@grabbin/ui/components/button";
import JoinForFreeButton from "@/components/landing/join-for-free-button";

function Logo({ className }: { className?: string }) {
	return (
		<div
			className={`flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}
		>
			<span aria-hidden="true" className="size-8 rounded-md bg-foreground" />
		</div>
	);
}

export default function LandingHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-[100003] w-full bg-background px-3 py-4 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-gradient-to-b after:from-background after:to-transparent after:content-[''] sm:px-6 sm:py-4">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between">
				<Logo className="shrink-0" />
				<div className="flex justify-end">
					<div className="flex flex-row items-center gap-2 sm:gap-2">
						<JoinForFreeButton
							variant="brandBlack"
							size="lg"
							className="h-10 w-auto shrink-0 px-4 text-sm sm:h-10 sm:text-base"
						/>
						<Button
							type="button"
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
