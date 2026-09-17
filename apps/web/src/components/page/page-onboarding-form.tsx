"use client";

import { pageProfileSchema } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import { FieldError } from "@grabbin/ui/components/field";
import Loading from "@grabbin/ui/components/loading";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import PageImageField from "./page-image-field";

export type PageData = {
	handle: string;
	onboarding: boolean;
	image: string | null;
	name: string | null;
	bio: string | null;
	isOwner?: boolean;
};

export default function PageOnboardingForm({
	page,
	onComplete,
}: {
	page: PageData;
	onComplete: (page: PageData) => void;
}) {
	const reduceMotion = useReducedMotion();
	const [image, setImage] = useState(page.image ?? "");
	const [name, setName] = useState(page.name ?? "");
	const [bio, setBio] = useState(page.bio ?? "");
	const [error, setError] = useState("");
	const [isFinished, setIsFinished] = useState(false);
	const [completedPage, setCompletedPage] = useState<PageData | null>(null);
	const mutation = useMutation({
		mutationFn: async (profile: v.InferOutput<typeof pageProfileSchema>) => {
			const response = await apiClient.pages[":handle"].$patch(
				{
					param: { handle: page.handle },
				},
				{
					init: {
						body: JSON.stringify(profile),
						headers: { "Content-Type": "application/json" },
					},
				},
			);
			if (!response.ok) {
				throw new Error(await getApiErrorMessage(response));
			}

			const body = await response.json();
			if (!("page" in body)) throw new Error("Please try again.");
			return body.page;
		},
		onSuccess: (nextPage) => {
			setCompletedPage({ ...nextPage, isOwner: true });
			setIsFinished(true);
		},
		onError: (mutationError) => {
			setError(
				mutationError instanceof Error
					? mutationError.message
					: "Please try again.",
			);
		},
	});

	const transition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 0.55, bounce: 0.15 };

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(pageProfileSchema, {
			image: image.trim() || null,
			name,
			bio,
		});
		if (!parsed.success) {
			setError("Enter a valid name.");
			return;
		}

		setError("");
		mutation.mutate(parsed.output);
	};

	return (
		<motion.form
			layout="position"
			transition={transition}
			onSubmit={handleSubmit}
			className="w-full"
		>
			<AnimatePresence initial={false} mode="popLayout">
				{!mutation.isPending && !isFinished && (
					<motion.header
						key="onboarding-copy"
						initial={{ opacity: 1, y: 0 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -12 }}
						transition={transition}
						className="mb-8 flex w-full flex-col gap-0.5"
					>
						<h1 className="font-medium text-xl">Make it yours</h1>
						<p className="text-wrap text-muted-foreground text-sm">
							Add a few details to finish your public page.
						</p>
					</motion.header>
				)}
			</AnimatePresence>

			<motion.div
				layout="position"
				transition={transition}
				className="mb-4 flex flex-col gap-8"
			>
				<PageImageField
					value={image}
					onChange={(value) => {
						setImage(value);
						setError("");
					}}
					onError={setError}
				/>
				<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
					<textarea
						id="page-name"
						name="name"
						aria-label="Name"
						autoComplete="name"
						className="editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap font-bold text-3xl leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-[40px]"
						rows={1}
						placeholder="Name"
						required
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setError("");
						}}
						aria-invalid={!!error}
						aria-describedby="profile-error"
					/>
					<textarea
						id="page-bio"
						name="bio"
						aria-label="Bio"
						className="editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap px-0.5 text-base text-primary/80 leading-6 outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-xl min-[90rem]:leading-8"
						rows={2}
						placeholder="Tell about you"
						value={bio}
						onChange={(event) => setBio(event.target.value)}
						aria-describedby="profile-error"
					/>
					<div id="profile-error" className="min-h-5" aria-live="polite">
						<FieldError className="text-xs">{error}</FieldError>
					</div>
				</div>
			</motion.div>

			<AnimatePresence
				initial={false}
				mode="popLayout"
				onExitComplete={() => {
					if (completedPage) onComplete(completedPage);
				}}
			>
				{!isFinished && (
					<motion.div
						key="onboarding-submit"
						initial={{ opacity: 1, y: 0 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
						transition={transition}
						layout="position"
					>
						<Button
							type="submit"
							disabled={mutation.isPending}
							className="h-11 w-full"
						>
							{mutation.isPending ? <Loading /> : "Done"}
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.form>
	);
}
