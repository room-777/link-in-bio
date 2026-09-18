"use client";

import {
	type PageData,
	pageImageKeySchema,
	pageImageUploadSchema,
	pageProfileSchema,
} from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageProfileFields from "./page-profile-fields";

export default function PageProfileForm({
	page,
	mode,
}: {
	page: PageData;
	mode: "onboarding" | "edit";
}) {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [imageKey, setImageKey] = useState(page.image ?? "");
	const [imageUrl, setImageUrl] = useState(getPageImageUrl(page.image) ?? "");
	const [name, setName] = useState(page.name ?? "");
	const [bio, setBio] = useState(page.bio ?? "");
	const [error, setError] = useState("");
	const [isImageUploading, setIsImageUploading] = useState(false);
	const [uploadedImageKey, setUploadedImageKey] = useState("");
	const [isSaved, setIsSaved] = useState(false);

	const mutation = useMutation({
		mutationFn: async (profile: v.InferOutput<typeof pageProfileSchema>) => {
			const response = await apiClient.pages[":handle"].$patch(
				{ param: { handle: page.handle } },
				{
					init: {
						body: JSON.stringify(profile),
						headers: { "Content-Type": "application/json" },
					},
				},
			);
			if (!response.ok) throw new Error(await getApiErrorMessage(response));

			const body = await response.json();
			if (!("page" in body)) throw new Error("Please try again.");
			return body.page;
		},
		onSuccess: () => {
			setIsSaved(true);
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
	const isFinished = mode === "onboarding" && isSaved;
	const activeTransition =
		mutation.isPending || isFinished ? layoutTransition : transition;

	const cleanupUploadedImage = async (key: string) => {
		const parsed = v.safeParse(pageImageKeySchema, { key });
		if (!parsed.success) return;
		await apiClient.pages[":handle"]["profile-image"]
			.$delete(
				{ param: { handle: page.handle } },
				{
					init: {
						body: JSON.stringify(parsed.output),
						headers: { "Content-Type": "application/json" },
					},
				},
			)
			.catch(() => undefined);
	};

	const handleImageSelect = async (file: File) => {
		const parsed = v.safeParse(pageImageUploadSchema, {
			contentType: file.type,
			size: file.size,
		});
		if (!parsed.success) {
			setError("Choose a supported image smaller than 5 MB.");
			return;
		}

		setError("");
		setIsImageUploading(true);
		if (uploadedImageKey) {
			await cleanupUploadedImage(uploadedImageKey);
			setUploadedImageKey("");
		}
		let key = "";
		try {
			const response = await apiClient.pages[":handle"]["profile-image"][
				"upload-url"
			].$post(
				{ param: { handle: page.handle } },
				{
					init: {
						body: JSON.stringify(parsed.output),
						headers: { "Content-Type": "application/json" },
					},
				},
			);
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			const body = await response.json();
			if (!("key" in body && "uploadUrl" in body)) {
				throw new Error("Please try again.");
			}
			key = body.key;

			const uploadResponse = await fetch(body.uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!uploadResponse.ok) throw new Error("The image upload failed.");

			setImageKey(key);
			setUploadedImageKey(key);
			setImageUrl(getPageImageUrl(key) ?? "");
		} catch (uploadError) {
			if (key) await cleanupUploadedImage(key);
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "The image upload failed.",
			);
		} finally {
			setIsImageUploading(false);
		}
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(pageProfileSchema, {
			image: imageKey.trim() || null,
			name,
			bio,
		});
		if (!parsed.success) {
			setError("Enter a valid name.");
			return;
		}

		setError("");
		setIsSaved(false);
		mutation.mutate(parsed.output, {
			onSuccess: () => setUploadedImageKey(""),
			onError: () => {
				if (uploadedImageKey) void cleanupUploadedImage(uploadedImageKey);
			},
		});
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
				{mode === "onboarding" && !mutation.isPending && !isFinished && (
					<motion.header
						key="profile-copy"
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
				<PageProfileFields
					imageUrl={imageUrl}
					isImageUploading={isImageUploading}
					onSelectImage={handleImageSelect}
					onRemoveImage={() => {
						if (uploadedImageKey) void cleanupUploadedImage(uploadedImageKey);
						setImageKey("");
						setImageUrl("");
						setUploadedImageKey("");
						setIsSaved(false);
					}}
					onImageError={setError}
					name={name}
					bio={bio}
					onNameChange={(value) => {
						setName(value);
						setError("");
					}}
					onBioChange={(value) => {
						setBio(value);
						setError("");
					}}
					error={error}
				/>
			</motion.div>

			<AnimatePresence
				initial={false}
				mode="popLayout"
				onExitComplete={() => {
					if (mode === "onboarding") router.refresh();
				}}
			>
				{mode === "onboarding" && !isFinished && (
					<motion.div
						key="profile-submit"
						initial={{ opacity: 1, y: 0 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
						transition={submitTransition}
						layout="position"
					>
						<Button
							type="submit"
							size="xl"
							disabled={mutation.isPending || isImageUploading}
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
