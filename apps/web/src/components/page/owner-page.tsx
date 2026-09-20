"use client";

import type { PageData } from "@grabbin/api";
import { useState } from "react";

import PageFooter from "./page-footer";
import PageOnboardingForm from "./page-onboarding-form";
import PageProfileForm from "./page-profile-form";

export default function OwnerPage({ page }: { page: PageData }) {
	const [currentPage, setCurrentPage] = useState(page);

	const handleChange = (handle: string) => {
		setCurrentPage((page) => ({ ...page, handle }));
		window.history.replaceState(null, "", `/${encodeURIComponent(handle)}`);
	};

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-between gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
			{currentPage.onboarding ? (
				<PageProfileForm page={currentPage} mode="edit" />
			) : (
				<PageOnboardingForm page={currentPage} />
			)}
			<PageFooter
				handle={currentPage.handle}
				isOwner
				onHandleChange={handleChange}
			/>
		</main>
	);
}
