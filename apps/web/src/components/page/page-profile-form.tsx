"use client";

import {
	type PageData,
	pageImageKeySchema,
	pageImageUploadSchema,
	pageProfileSchema,
} from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useState } from "react";
import Confetti from "react-confetti";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
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
	const [imageKey, setImageKey] = useState(page.imageKey ?? "");
	const [imageUrl, setImageUrl] = useState(
		getPageImageUrl(page.imageKey) ?? "",
	);
	const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
	const [name, setName] = useState(page.name ?? "");
	const [bio, setBio] = useState(page.bio ?? "");
	const [error, setError] = useState("");
	const [isImageUploading, setIsImageUploading] = useState(false);
	const [isSaved, setIsSaved] = useState(false);
	const [isExiting, setIsExiting] = useState(false);

	useEffect(() => {
		return () => {
			if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

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
			if (mode === "onboarding") setIsExiting(true);
		},
		onError: (mutationError) => {
			const message =
				mutationError instanceof Error
					? mutationError.message
					: "Please try again.";
			if (message === "The uploaded image is invalid.") {
				toast({ message, state: "error" });
				return;
			}
			setError(message);
		},
	});

	const transition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 0.55, bounce: 0.15 };
	const isFinished = mode === "onboarding" && isSaved && !isExiting;
	const shouldShowConfetti = mode === "onboarding" && isSaved;

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

	const handleImageSelect = (file: File) => {
		const parsed = v.safeParse(pageImageUploadSchema, {
			contentType: file.type,
			size: file.size,
		});
		if (!parsed.success) {
			toast({
				message: "Choose a supported image smaller than 5 MB.",
				state: "error",
			});
			return;
		}

		setError("");
		setSelectedImageFile(file);
		setImageUrl(URL.createObjectURL(file));
		setIsSaved(false);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(pageProfileSchema, {
			imageKey: imageKey.trim() || null,
			name,
			bio,
		});
		if (!parsed.success) {
			setError("Enter a valid name.");
			return;
		}

		setError("");
		setIsSaved(false);
		setIsImageUploading(Boolean(selectedImageFile));
		let uploadedKey = "";
		try {
			if (selectedImageFile) {
				const uploadUrlResponse = await apiClient.pages[":handle"][
					"profile-image"
				]["upload-url"].$post(
					{ param: { handle: page.handle } },
					{
						init: {
							body: JSON.stringify({
								contentType: selectedImageFile.type,
								size: selectedImageFile.size,
							}),
							headers: { "Content-Type": "application/json" },
						},
					},
				);
				if (!uploadUrlResponse.ok) {
					throw new Error(await getApiErrorMessage(uploadUrlResponse));
				}

				const upload = await uploadUrlResponse.json();
				if (!("key" in upload && "uploadUrl" in upload)) {
					throw new Error("Please try again.");
				}
				uploadedKey = upload.key;
				const uploadResponse = await fetch(upload.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": selectedImageFile.type },
					body: selectedImageFile,
				});
				if (!uploadResponse.ok) {
					throw new Error("The image upload failed.");
				}
			}

			const profile = v.parse(pageProfileSchema, {
				imageKey: uploadedKey || imageKey.trim() || null,
				name,
				bio,
			});
			mutation.mutate(profile, {
				onSuccess: () => {
					setImageKey(profile.imageKey ?? "");
					setSelectedImageFile(null);
					if (profile.imageKey) {
						setImageUrl(getPageImageUrl(profile.imageKey) ?? "");
					}
				},
				onError: () => {
					if (uploadedKey) void cleanupUploadedImage(uploadedKey);
				},
			});
		} catch (submitError) {
			if (uploadedKey) await cleanupUploadedImage(uploadedKey);
			toast({
				message:
					submitError instanceof Error
						? submitError.message
						: "The image upload failed.",
				state: "error",
			});
		} finally {
			setIsImageUploading(false);
		}
	};

	return (
		<div className="w-full">
			{shouldShowConfetti && (
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
			)}
			<Activity mode={isFinished ? "hidden" : "visible"}>
				<motion.form
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={isExiting ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
					transition={transition}
					onAnimationComplete={() => {
						if (isExiting) {
							setIsExiting(false);
						}
					}}
					onSubmit={handleSubmit}
					className="w-full"
				>
					{mode === "onboarding" && (
						<header className="mb-8 flex w-full flex-col gap-0.5">
							<h1 className="font-semibold text-2xl">Make it yours</h1>
							<p className="text-wrap text-base text-primary/80">
								Add a few details to finish your public page.
							</p>
						</header>
					)}

					<div className="mb-4 flex flex-col gap-8">
						<PageProfileFields
							imageUrl={imageUrl}
							isImageUploading={isImageUploading}
							onSelectImage={handleImageSelect}
							onRemoveImage={() => {
								setImageKey("");
								setImageUrl("");
								setSelectedImageFile(null);
								setIsSaved(false);
							}}
							onImageError={(message) => toast({ message, state: "error" })}
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
					</div>

					{mode === "onboarding" && !isFinished && (
						<Button
							type="submit"
							size="xl"
							disabled={mutation.isPending || isImageUploading || isExiting}
							className="smooth-shadow-xs h-12 w-full max-w-sm text-base"
						>
							{mutation.isPending ? <Loading /> : "Done"}
						</Button>
					)}
				</motion.form>
			</Activity>

			<Activity mode={isFinished ? "visible" : "hidden"}>
				{isFinished && (
					<motion.div
						initial={reduceMotion ? false : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={transition}
					>
						<PageOnboardingComplete
							page={page}
							onGoToProfile={() => router.refresh()}
						/>
					</motion.div>
				)}
			</Activity>
		</div>
	);
}

function PageOnboardingComplete({
	page,
	onGoToProfile,
}: {
	page: PageData;
	onGoToProfile: () => void;
}) {
	const [isShown, setIsShown] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const reduceMotion = useReducedMotion();
	const domain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";

	useEffect(() => {
		setIsShown(true);
	}, []);

	useEffect(() => {
		if (!isCopied) return;
		const timeout = window.setTimeout(() => setIsCopied(false), 1800);
		return () => window.clearTimeout(timeout);
	}, [isCopied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(
				new URL(`/${page.handle}`, window.location.origin).toString(),
			);
			setIsCopied(true);
		} catch {
			setIsCopied(false);
		}
	};

	return (
		<section className="flex w-full max-w-sm flex-col gap-12">
			<header
				className={`t-stagger mb-4 flex w-full flex-col gap-0.5 ${isShown ? "is-shown" : ""}`}
			>
				<CheckCircle
					weight="Filled"
					className="size-12 text-brand-green"
					aria-hidden={true}
				/>
				<h1 className="font-semibold text-2xl">Looking good!</h1>
				<p className="text-base text-primary/80">
					Now you can customize your profile and share it!
				</p>
			</header>

			<div className="space-y-2">
				<div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-secondary p-1.5 pl-3 text-sm">
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
						<span className="relative inline-grid place-items-center">
							<AnimatePresence initial={false} mode="popLayout">
								<motion.span
									key={isCopied ? "copied" : "copy-link"}
									initial={
										reduceMotion
											? false
											: {
													opacity: 0,
													scale: 0.25,
													filter: "blur(4px)",
												}
									}
									animate={{
										opacity: 1,
										scale: 1,
										filter: "blur(0px)",
									}}
									exit={{
										opacity: 0,
										scale: 0.25,
										filter: "blur(4px)",
									}}
									transition={{
										type: "spring",
										duration: 0.3,
										bounce: 0,
									}}
									className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
								>
									{isCopied ? (
										<Check className="size-4" aria-hidden={true} />
									) : (
										<Copy className="size-4" aria-hidden={true} />
									)}
								</motion.span>
							</AnimatePresence>
						</span>
					</Button>
				</div>
				<Button
					type="button"
					size="xl"
					className="smooth-shadow-xs mt-0 h-12 w-full text-base"
					onClick={onGoToProfile}
				>
					Go to profile
				</Button>
			</div>
		</section>
	);
}
