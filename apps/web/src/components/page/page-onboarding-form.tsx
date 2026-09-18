"use client";

import type { PageData as ApiPageData } from "@grabbin/api";
import PageProfileForm from "./page-profile-form";

export type PageData = ApiPageData;

export default function PageOnboardingForm({ page }: { page: PageData }) {
	return <PageProfileForm page={page} mode="onboarding" />;
}
