"use client";

import type { PageData as ApiPageData } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import PageProfileForm from "./page-profile-form";

export type PageData = ApiPageData;

export default function PageOnboardingForm({
	page,
	breakpoint = "wide",
	onOnboardingComplete,
}: {
	page: PageData;
	breakpoint?: BentoBreakpoint;
	onOnboardingComplete?: (stage: "exiting" | "complete") => void;
}) {
	return (
		<PageProfileForm
			page={page}
			mode="onboarding"
			breakpoint={breakpoint}
			onOnboardingComplete={onOnboardingComplete}
		/>
	);
}
