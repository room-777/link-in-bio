"use client";

import { pageProfileSchema } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import { Field, FieldError, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupTextarea,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
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

export default function PageOnboardingForm({ page }: { page: PageData }) {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [image, setImage] = useState(page.image ?? "");
	const [name, setName] = useState(page.name ?? "");
	const [bio, setBio] = useState(page.bio ?? "");
	const [error, setError] = useState("");
	const [isFinished, setIsFinished] = useState(false);
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
		onSuccess: () => setIsFinished(true),
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
	const submitTransition = reduceMotion
		? { duration: 0 }
		: {
				type: "spring" as const,
				duration: 0.85,
				bounce: 0.1,
				opacity: {
					duration: 0.65,
					ease: [0.23, 1, 0.32, 1] as const,
				},
			};
	const layoutTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 1.1, bounce: 0.1 };
	const activeTransition =
		mutation.isPending || isFinished ? layoutTransition : transition;

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
			initial={reduceMotion ? false : { opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			layout="position"
			transition={activeTransition}
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
						transition={submitTransition}
						className="mb-8 flex w-full flex-col gap-0.5"
					>
						<h1 className="font-semibold text-2xl">Make it yours</h1>
						<p className="text-wrap text-base text-primary/80">
							Add a few details to finish your public page.
						</p>
					</motion.header>
				)}
			</AnimatePresence>

			<motion.div
				layout="position"
				transition={activeTransition}
				className="mb-4 flex flex-col gap-8"
			>
				<FieldGroup className="gap-8">
					<Field data-invalid={!!error} className="gap-8">
						<PageImageField
							value={image}
							onChange={(value) => {
								setImage(value);
								setError("");
							}}
							onError={setError}
						/>
						<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
							<InputGroup className="h-auto rounded-none bg-transparent">
								<InputGroupTextarea
									id="page-name"
									name="name"
									aria-label="Name"
									autoComplete="name"
									className="editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! p-0! font-bold text-3xl! leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-[40px]!"
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
							</InputGroup>
							<InputGroup className="h-auto rounded-none bg-transparent">
								<InputGroupTextarea
									id="page-bio"
									name="bio"
									aria-label="Bio"
									className="editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! px-0.5! text-base! text-primary/80 leading-6 outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-xl! min-[90rem]:leading-8"
									rows={2}
									placeholder="Tell about you"
									value={bio}
									onChange={(event) => {
										setBio(event.target.value);
										setError("");
									}}
									aria-invalid={!!error}
									aria-describedby="profile-error"
								/>
							</InputGroup>
							<div id="profile-error" className="min-h-5" aria-live="polite">
								<FieldError className="text-xs">{error}</FieldError>
							</div>
						</div>
					</Field>
				</FieldGroup>
			</motion.div>

			<AnimatePresence
				initial={false}
				mode="popLayout"
				onExitComplete={() => router.refresh()}
			>
				{!isFinished && (
					<motion.div
						key="onboarding-submit"
						initial={{ opacity: 1, y: 0 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
						transition={submitTransition}
						layout="position"
					>
						<Button
							type="submit"
							size={"xl"}
							disabled={mutation.isPending}
							className="smooth-shadow-xs h-11 w-full max-w-sm text-base"
						>
							{mutation.isPending ? <Loading /> : "Done"}
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.form>
	);
}
