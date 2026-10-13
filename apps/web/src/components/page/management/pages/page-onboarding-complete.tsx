"use client";

import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { CopyStateIcon } from "@/components/copy-state-icon";
import { useClipboardCopy } from "@/hooks/use-clipboard-copy";

export function PageOnboardingComplete({
	page,
	onGoToProfile: handleGoToProfile,
	actionLabel = "Go to profile",
}: {
	page: { handle: string };
	onGoToProfile: () => void;
	actionLabel?: string;
}) {
	const [isShown, setIsShown] = useState(false);
	const { copiedKey, copyText } = useClipboardCopy();
	const isCopied = copiedKey === "page-link";
	const reduceMotion = useReducedMotion();
	const domain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";

	useEffect(() => {
		setIsShown(true);
	}, []);

	const handleCopy = async () => {
		await copyText(
			new URL(`/${page.handle}`, window.location.origin).toString(),
			"page-link",
		);
	};

	return (
		<>
			<Confetti
				numberOfPieces={240}
				recycle={false}
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 50,
					pointerEvents: "none",
				}}
			/>
			<section className="flex w-full max-w-sm flex-col gap-12">
				<header
					className={`t-stagger mb-4 flex w-full flex-col gap-0.5 ${isShown ? "is-shown" : ""}`}
				>
					<span
						className="t-success-check mb-4 self-start"
						data-state="in"
						aria-hidden="true"
					>
						<CheckCircle weight="Filled" className="size-12 text-brand-green" />
					</span>
					<h1 className="t-stagger-line t-stagger-line--1 font-semibold text-2xl">
						Looking good!
					</h1>
					<p className="t-stagger-line t-stagger-line--2 text-base text-primary/80">
						Now you can customize your profile and share it!
					</p>
				</header>

				<div className="space-y-2">
					<div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-secondary p-1.5 pl-3 font-medium text-base">
						<span className="truncate text-muted-foreground">
							{domain}/<span className="text-foreground">{page.handle}</span>
						</span>
						<Button
							type="button"
							variant="outline"
							size="icon-lg"
							aria-label={isCopied ? "Copied" : "Copy link"}
							onClick={handleCopy}
							className="rounded-md hover:bg-background"
						>
							<CopyStateIcon
								copied={isCopied}
								reduceMotion={reduceMotion ?? false}
							/>
						</Button>
					</div>
					<Button
						type="button"
						variant={"brandBlack"}
						size="xl"
						className="smooth-shadow-xs mt-0 h-12 w-full text-base drop-shadow-md"
						onClick={handleGoToProfile}
					>
						{actionLabel}
					</Button>
				</div>
			</section>
		</>
	);
}
