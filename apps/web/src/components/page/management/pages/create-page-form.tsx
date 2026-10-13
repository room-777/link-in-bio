"use client";

import { Button } from "@grabbin/ui/components/button";
import { cn } from "@grabbin/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Activity, useState } from "react";
import { useCreatePage } from "@/mutation/page/create";
import { PageHandleForm } from "./page-handle-form";
import { PageOnboardingComplete } from "./page-onboarding-complete";

export default function CreatePageForm({
	presentation = "page",
	onComplete,
	onBack: handleBack,
}: {
	presentation?: "page" | "dialog";
	onComplete?: (handle: string) => void;
	onBack?: () => void;
}) {
	const router = useRouter();
	const createPage = useCreatePage();
	const isDialog = presentation === "dialog";
	const reduceMotion = useReducedMotion();
	const [activity, setActivity] = useState<"create" | "exiting" | "complete">(
		"create",
	);
	const [createdPage, setCreatedPage] = useState<{ handle: string } | null>(
		null,
	);
	const entryTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 0.55, bounce: 0.1 };
	const exitTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.42, ease: [0.23, 1, 0.32, 1] as const };

	return (
		<div
			className={cn(
				"relative flex min-w-0",
				isDialog
					? "h-full min-h-0 w-full"
					: "min-h-svh items-center justify-center",
			)}
		>
			<Activity mode={activity === "complete" ? "hidden" : "visible"}>
				<motion.main
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={
						activity === "create"
							? { opacity: 1, y: 0 }
							: { opacity: 0, y: -16 }
					}
					transition={activity === "create" ? entryTransition : exitTransition}
					onAnimationComplete={() => {
						if (activity === "exiting") setActivity("complete");
					}}
					aria-hidden={activity !== "create"}
					inert={activity !== "create"}
					className={cn(
						isDialog
							? "flex h-full min-h-0 w-full flex-col gap-3 p-1"
							: "mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 p-6",
						activity === "complete" && "pointer-events-none absolute inset-0",
					)}
				>
					{isDialog && handleBack && activity !== "complete" && (
						<Button
							variant="outline"
							size="xl"
							className="-ml-1 self-start rounded-md text-base"
							onClick={handleBack}
						>
							Cancel
						</Button>
					)}
					<div className={isDialog ? "min-h-0 flex-1" : "min-[90rem]:max-w-sm"}>
						<PageHandleForm
							compact={isDialog}
							title="Choose a unique handle for your page"
							description=""
							submitLabel="Grab it"
							titleClassName="text-lg font-medium"
							buttonClassName="drop-shadow-md"
							onSubmit={async (handle) => {
								const createdHandle = await createPage.mutateAsync(handle);
								setCreatedPage({ handle: createdHandle });
								setActivity("exiting");
							}}
						/>
					</div>
				</motion.main>
			</Activity>
			<Activity mode={activity === "complete" ? "visible" : "hidden"}>
				{activity === "complete" && createdPage && (
					<motion.main
						initial={reduceMotion ? false : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={entryTransition}
						className={cn(
							isDialog
								? "flex h-full min-h-0 w-full flex-col items-center justify-center gap-6 p-1"
								: "mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-8 p-6",
						)}
					>
						<PageOnboardingComplete
							page={createdPage}
							onGoToProfile={() => {
								if (onComplete) onComplete(createdPage.handle);
								else
									router.replace(`/${encodeURIComponent(createdPage.handle)}`);
							}}
						/>
					</motion.main>
				)}
			</Activity>
		</div>
	);
}
