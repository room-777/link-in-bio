"use client";

import type { PageData as ApiPageData } from "@grabbin/api";
import PageProfileForm from "./page-profile-form";

export type PageData = ApiPageData;

export default function PageOnboardingForm({
	page,
	onOnboardingComplete,
}: {
	page: PageData;
	onOnboardingComplete?: (stage: "exiting" | "complete") => void;
}) {
	return (
		<PageProfileForm
			page={page}
			mode="onboarding"
			onOnboardingComplete={onOnboardingComplete}
		/>
	);
}
