"use client";

import { type PageData, pageImageUploadSchema } from "@grabbin/api";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import * as v from "valibot";

import { usePageAutoSave } from "@/hooks/use-page-auto-save";
import { getErrorMessage } from "@/lib/error-message";
import { getPageImageUrl } from "@/lib/page-image-url";
import {
	cleanupUploadedPageProfileImage,
	uploadPageProfileImage,
} from "@/query/page/profile-image";

export function usePageProfileForm(page: PageData, demoMode: boolean) {
	const uploadImageMutation = useMutation({
		mutationFn: ({ handle, file }: { handle: string; file: File }) =>
			uploadPageProfileImage(handle, file),
	});
	const cleanupImageMutation = useMutation({
		mutationFn: ({ handle, key }: { handle: string; key: string }) =>
			cleanupUploadedPageProfileImage(handle, key),
	});
	const cleanupUploadedImage = useCallback(
		(key: string) =>
			cleanupImageMutation.mutateAsync({ handle: page.handle, key }),
		[cleanupImageMutation.mutateAsync, page.handle],
	);
	const { draft, error, status, updateField } = usePageAutoSave({
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
	const [imageUrl, setImageUrl] = useState(
		getPageImageUrl(page.imageSource ?? page.imageKey, {
			width: 1024,
			height: 1024,
			format: "auto",
			fit: "scale-down",
		}) ?? "",
	);
	const [previewImageUrl, setPreviewImageUrl] = useState("");
	const uploadVersionRef = useRef(0);

	useEffect(() => {
		return () => {
			if (previewImageUrl.startsWith("blob:")) {
				URL.revokeObjectURL(previewImageUrl);
			}
		};
	}, [previewImageUrl]);

	useEffect(() => {
		if (uploadImageMutation.isPending) return;
		const imageKey =
			draft.imageKey === (page.imageKey ?? "")
				? (page.imageSource ?? page.imageKey)
				: draft.imageKey;
		setImageUrl(
			getPageImageUrl(imageKey, {
				width: 1024,
				height: 1024,
				format: "auto",
				fit: "scale-down",
			}) ?? "",
		);
	}, [
		draft.imageKey,
		page.imageKey,
		page.imageSource,
		uploadImageMutation.isPending,
	]);

	async function selectImage(file: File) {
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

		const previewUrl = URL.createObjectURL(file);
		setPreviewImageUrl(previewUrl);
		setImageUrl(previewUrl);
		if (demoMode) return;

		const currentUploadVersion = ++uploadVersionRef.current;
		let uploadedKey = "";
		try {
			uploadedKey = await uploadImageMutation.mutateAsync({
				handle: page.handle,
				file,
			});
			if (currentUploadVersion !== uploadVersionRef.current) {
				await cleanupUploadedImage(uploadedKey);
				return;
			}
			updateField("imageKey", uploadedKey);
			updateField("imageCrop", null);
		} catch (caught) {
			if (uploadedKey) await cleanupUploadedImage(uploadedKey);
			if (currentUploadVersion !== uploadVersionRef.current) return;
			setImageUrl(getPageImageUrl(draft.imageKey) ?? "");
			toast({
				message: getErrorMessage(caught, "The image upload failed."),
				state: "error",
			});
		}
	}

	function removeImage() {
		uploadVersionRef.current += 1;
		setPreviewImageUrl("");
		updateField("imageKey", "");
		updateField("imageCrop", null);
		setImageUrl("");
	}

	const handleImageLoaded = useCallback(
		(loadedUrl: string) => {
			if (imageUrl !== loadedUrl) return;
			setPreviewImageUrl((current) =>
				current && current !== loadedUrl ? "" : current,
			);
		},
		[imageUrl],
	);

	return {
		draft,
		error,
		status,
		updateField,
		imageUrl,
		previewImageUrl,
		isImageUploading: uploadImageMutation.isPending,
		onImageLoaded: handleImageLoaded,
		onImageSelect: selectImage,
		onImageRemove: removeImage,
	};
}
