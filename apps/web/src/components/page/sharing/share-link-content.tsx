"use client";

import { ConfettiButton } from "@grabbin/ui/components/confetti";
import { DialogFooter } from "@grabbin/ui/components/dialog";
// ponytail: Keep qr at 0.5.5 until Cuer stops passing border=0 to newer encoders.
import { Cuer } from "cuer";
import type { MouseEvent } from "react";
import { useShareLinkCopy } from "@/hooks/use-share-link-copy";
import { useTextSwap } from "@/hooks/use-text-swap";

export default function ShareLinkContent({
	profileImageUrl,
}: {
	profileImageUrl: string | null;
}) {
	const { copyState, copyLink } = useShareLinkCopy();
	const label =
		copyState === "copied"
			? "Copied Link"
			: copyState === "error"
				? "Copy Failed"
				: "Copy Link";
	const { displayedValue, elementRef, className } = useTextSwap(label);

	const handleCopyLink = async (event: MouseEvent<HTMLButtonElement>) => {
		if (!(await copyLink())) event.preventDefault();
	};

	return (
		<>
			<div className="mt-9 flex items-center justify-center py-3">
				<Cuer
					value={window.location.href}
					color="#171717"
					className="size-48"
					arena={profileImageUrl}
					aria-label="QR code for your page"
				/>
			</div>
			<DialogFooter className="flex-row justify-center border-t-0 bg-background sm:justify-center">
				<ConfettiButton
					type="button"
					variant="outline"
					className="w-28"
					options={{ particleCount: 150, scalar: 1.5, spread: 100 }}
					onClick={handleCopyLink}
				>
					<span ref={elementRef} className={className} aria-live="polite">
						{displayedValue}
					</span>
				</ConfettiButton>
			</DialogFooter>
		</>
	);
}
