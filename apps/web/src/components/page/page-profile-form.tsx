"use client";

import {
	type PageData,
	pageImageKeySchema,
	pageImageUploadSchema,
} from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { toast } from "@grabbin/ui/components/toast";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import * as v from "valibot";

import { usePageAutoSave } from "@/hooks/use-page-auto-save";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getPageImageUrl } from "@/lib/page-image-url";
import PageProfileFields from "./page-profile-fields";

const PROFILE_ENTRY_START = { opacity: 0, y: 16 };
const PROFILE_ENTRY_END = { opacity: 1, y: 0 };
const PROFILE_ENTRY_TRANSITION = {
	type: "spring" as const,
	duration: 0.55,
	bounce: 0.15,
};
const REDUCED_MOTION_TRANSITION = { duration: 0 };

export default function PageProfileForm({
	page,
	demoMode = false,
	breakpoint = "wide",
	entryAnimationRevision = 0,
	onSavingChange,
	onEntryComplete,
}: {
	page: PageData;
	demoMode?: boolean;
	breakpoint?: BentoBreakpoint;
	entryAnimationRevision?: number;
	onSavingChange?: (isSaving: boolean) => void;
	onEntryComplete?: () => void;
}) {
	const reduceMotion = useReducedMotion();
	const entryAnimation = useAnimationControls();
	const [imageUrl, setImageUrl] = useState(
		getPageImageUrl(page.imageSource ?? page.imageKey, {
			width: 1024,
			height: 1024,
			format: "auto",
			fit: "scale-down",
		}) ?? "",
	);
	const [isImageUploading, setIsImageUploading] = useState(false);
	const uploadVersionRef = useRef(0);

	const cleanupUploadedImage = useCallback(
		async (key: string) => {
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
		},
		[page.handle],
	);

	const {
		draft,
		error: autoSaveError,
		status: autoSaveStatus,
		updateField,
	} = usePageAutoSave({
		handle: page.handle,
		page,
		enabled: !demoMode,
		onSaveFailure: (changes, discardedImageKey, savedImageKey) => {
			const keys = new Set(
				[changes.imageKey, discardedImageKey].filter((key): key is string =>
					Boolean(key && key !== savedImageKey),
				),
			);
			for (const key of keys) void cleanupUploadedImage(key);
		},
	});
	const isSaving = autoSaveStatus === "saving";

	useEffect(() => {
		onSavingChange?.(isSaving);
	}, [isSaving, onSavingChange]);

	useEffect(() => {
		if (reduceMotion) onEntryComplete?.();
	}, [onEntryComplete, reduceMotion]);

	useEffect(() => {
		if (!autoSaveError) return;
		toast({ message: autoSaveError, state: "error" });
	}, [autoSaveError]);

	useEffect(() => {
		return () => {
			if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	useEffect(() => {
		if (!isImageUploading) {
			setImageUrl(
				getPageImageUrl(
					draft.imageKey === (page.imageKey ?? "")
						? (page.imageSource ?? page.imageKey)
						: draft.imageKey,
					{ width: 1024, height: 1024, format: "auto", fit: "scale-down" },
				) ?? "",
			);
		}
	}, [draft.imageKey, isImageUploading, page.imageKey, page.imageSource]);

	const transition = reduceMotion
		? REDUCED_MOTION_TRANSITION
		: PROFILE_ENTRY_TRANSITION;
	useLayoutEffect(() => {
		entryAnimation.stop();
		if (reduceMotion) {
			entryAnimation.set(PROFILE_ENTRY_END);
			if (entryAnimationRevision > 0) onEntryComplete?.();
			return;
		}

		entryAnimation.set(PROFILE_ENTRY_START);
		const frame = window.requestAnimationFrame(() => {
			void entryAnimation.start(PROFILE_ENTRY_END, transition);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			entryAnimation.stop();
		};
	}, [
		entryAnimationRevision,
		entryAnimation,
		onEntryComplete,
		reduceMotion,
		transition,
	]);
	const handleImageSelect = async (file: File) => {
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
		if (demoMode) {
			setImageUrl(URL.createObjectURL(file));
			return;
		}

		const uploadVersion = ++uploadVersionRef.current;
		const previewUrl = URL.createObjectURL(file);
		setImageUrl(previewUrl);
		setIsImageUploading(true);
		let uploadedKey = "";
		try {
			const uploadUrlResponse = await apiClient.pages[":handle"][
				"profile-image"
			]["upload-url"].$post(
				{ param: { handle: page.handle } },
				{
					init: {
						body: JSON.stringify({
							contentType: file.type,
							size: file.size,
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
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!uploadResponse.ok) throw new Error("The image upload failed.");

			if (uploadVersion !== uploadVersionRef.current) {
				await cleanupUploadedImage(uploadedKey);
				return;
			}
			updateField("imageKey", uploadedKey);
			updateField("imageCrop", null);
		} catch (uploadError) {
			if (uploadedKey) await cleanupUploadedImage(uploadedKey);
			if (uploadVersion !== uploadVersionRef.current) return;
			setImageUrl(getPageImageUrl(draft.imageKey) ?? "");
			toast({
				message:
					uploadError instanceof Error
						? uploadError.message
						: "The image upload failed.",
				state: "error",
			});
		} finally {
			if (uploadVersion === uploadVersionRef.current) {
				setIsImageUploading(false);
			}
		}
	};

	return (
		<div className="w-full">
			<motion.div
				initial={reduceMotion ? false : PROFILE_ENTRY_START}
				animate={entryAnimation}
				transition={transition}
				onAnimationComplete={onEntryComplete}
				className="w-full"
			>
				<div className="mb-4 flex flex-col gap-8">
					<PageProfileFields
						imageUrl={imageUrl}
						isImageUploading={isImageUploading || isSaving}
						onSelectImage={handleImageSelect}
						onRemoveImage={() => {
							uploadVersionRef.current += 1;
							updateField("imageKey", "");
							updateField("imageCrop", null);
							setImageUrl("");
						}}
						onImageError={(message) => toast({ message, state: "error" })}
						imageCrop={draft.imageCrop}
						onImageCropChange={(crop) => updateField("imageCrop", crop)}
						name={draft.name}
						bio={draft.bio}
						breakpoint={breakpoint}
						nameRequired={false}
						onNameChange={(value) => updateField("name", value)}
						onBioChange={(value) => updateField("bio", value)}
						error={autoSaveError ?? ""}
					/>
				</div>
			</motion.div>
		</div>
	);
}
