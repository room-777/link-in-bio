import type { PageItemUploadResponse } from "@grabbin/api";
import {
	pageItemUploadCompleteResponseSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export async function uploadBentoMedia(
	handle: string,
	file: File,
	options: {
		signal?: AbortSignal;
		onUploadCreated?: (upload: PageItemUploadResponse) => void;
		itemId?: string;
		kind?: "link-image";
	} = {},
) {
	const response = await apiClient.pages[":handle"].items.upload.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({
					contentType: file.type,
					size: file.size,
					...(options.itemId ? { itemId: options.itemId } : {}),
					...(options.kind ? { kind: options.kind } : {}),
				}),
				headers: { "Content-Type": "application/json" },
				signal: options.signal,
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const upload = v.parse(pageItemUploadResponseSchema, await response.json());
	options.onUploadCreated?.(upload);
	const uploadResponse = await fetch(upload.uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": file.type },
		body: file,
		signal: options.signal,
	});
	if (!uploadResponse.ok) throw new Error("The media upload failed.");

	const completeResponse = await apiClient.pages[
		":handle"
	].items.upload.complete.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({
					objectKey: upload.objectKey,
					...(options.itemId ? { itemId: options.itemId } : {}),
					...(options.kind ? { kind: options.kind } : {}),
				}),
				headers: { "Content-Type": "application/json" },
				signal: options.signal,
			},
		},
	);
	if (!completeResponse.ok) {
		throw new Error(await getApiErrorMessage(completeResponse));
	}
	return v.parse(
		pageItemUploadCompleteResponseSchema,
		await completeResponse.json(),
	);
}

export function useUploadBentoMediaMutation() {
	return useMutation({
		mutationFn: ({
			handle,
			file,
			options,
		}: {
			handle: string;
			file: File;
			options?: Parameters<typeof uploadBentoMedia>[2];
		}) => uploadBentoMedia(handle, file, options),
	});
}
