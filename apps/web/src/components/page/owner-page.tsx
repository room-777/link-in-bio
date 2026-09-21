"use client";

import type { PageData } from "@grabbin/api";
import { useEffect, useState } from "react";

import FloatPreview from "@/components/layout/float-preview";
import PageFooter from "./page-footer";
import PageOnboardingForm from "./page-onboarding-form";
import PageProfileForm from "./page-profile-form";

export default function OwnerPage({ page }: { page: PageData }) {
	const [currentPage, setCurrentPage] = useState(page);
	const [isFloatVisible, setIsFloatVisible] = useState(!page.onboarding);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setCurrentPage(page);
	}, [page]);

	const handleChange = (handle: string) => {
		setCurrentPage((page) => ({ ...page, handle }));
		window.history.replaceState(null, "", `/${encodeURIComponent(handle)}`);
	};
	const isOnboarding = !currentPage.onboarding;

	return (
		<div
			className={
				isOnboarding
					? "grid min-h-svh w-full grid-cols-1 lg:grid-cols-2"
					: undefined
			}
		>
			<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-between gap-8 p-6 px-6 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:px-16 min-[90rem]:pt-16">
				{currentPage.onboarding ? (
					<PageProfileForm
						page={currentPage}
						mode="edit"
						onSavingChange={setIsSaving}
					/>
				) : (
					<PageOnboardingForm
						page={currentPage}
						onOnboardingComplete={(stage) =>
							setIsFloatVisible(stage === "complete")
						}
					/>
				)}
				{!isOnboarding && (
					<PageFooter
						handle={currentPage.handle}
						isOwner
						onHandleChange={handleChange}
						isSaving={isSaving}
					/>
				)}
			</main>
			{isOnboarding && <FloatPreview visible={isFloatVisible} wideOnly />}
		</div>
	);
}
