"use client";

import { ConfettiButton } from "@grabbin/ui/components/confetti";
import { DialogFooter } from "@grabbin/ui/components/dialog";
// ponytail: Keep qr at 0.5.5 until Cuer stops passing border=0 to newer encoders.
import { Cuer } from "cuer";
import { type MouseEvent, useEffect, useRef, useState } from "react";

export default function ShareLinkContent({
	profileImageUrl,
}: {
	profileImageUrl: string | null;
}) {
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const [isLabelExiting, setIsLabelExiting] = useState(false);
	const [isLabelEntering, setIsLabelEntering] = useState(false);
	const labelRef = useRef<HTMLSpanElement>(null);
	const swapTimerRef = useRef<number | null>(null);
	const resetTimerRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (swapTimerRef.current !== null)
				window.clearTimeout(swapTimerRef.current);
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
		},
		[],
	);

	const swapCopyState = (nextState: "idle" | "copied" | "error") => {
		if (swapTimerRef.current !== null)
			window.clearTimeout(swapTimerRef.current);
		setIsLabelExiting(true);
		const duration =
			Number.parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue(
					"--text-swap-dur",
				),
			) || 150;
		swapTimerRef.current = window.setTimeout(() => {
			setCopyState(nextState);
			setIsLabelExiting(false);
			setIsLabelEntering(true);
			requestAnimationFrame(() => {
				if (labelRef.current) void labelRef.current.offsetHeight;
				setIsLabelEntering(false);
			});
			swapTimerRef.current = null;
		}, duration);
	};

	const handleCopyLink = async (event: MouseEvent<HTMLButtonElement>) => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			if (resetTimerRef.current !== null)
				window.clearTimeout(resetTimerRef.current);
			swapCopyState("copied");
			resetTimerRef.current = window.setTimeout(() => {
				swapCopyState("idle");
				resetTimerRef.current = null;
			}, 1800);
		} catch {
			event.preventDefault();
			swapCopyState("error");
		}
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
					<span
						ref={labelRef}
						className={[
							"t-text-swap",
							isLabelExiting && "is-exit",
							isLabelEntering && "is-enter-start",
						]
							.filter(Boolean)
							.join(" ")}
						aria-live="polite"
					>
						{copyState === "copied"
							? "Copied Link"
							: copyState === "error"
								? "Copy Failed"
								: "Copy Link"}
					</span>
				</ConfettiButton>
			</DialogFooter>
		</>
	);
}
