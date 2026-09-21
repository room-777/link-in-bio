import {
	type PageItemBatchRequest,
	type PageItemUploadResponse,
	pageItemBatchResponseSchema,
	pageItemMetadataResponseSchema,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "../api-client";

export async function patchBentoBatch(
	handle: string,
	batch: PageItemBatchRequest,
) {
	const response = await apiClient.pages[":handle"].batch.$patch(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify(batch),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageItemBatchResponseSchema, await response.json());
}

export async function refreshBentoLinkMetadata(
	handle: string,
	input: { itemId: string; url: string },
) {
	const response = await apiClient.pages[":handle"].metadata.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify(input),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageItemMetadataResponseSchema, await response.json());
}

export async function uploadBentoMedia(
	handle: string,
	itemId: string,
	file: File,
	options: {
		signal?: AbortSignal;
		onUploadCreated?: (upload: PageItemUploadResponse) => void;
	} = {},
) {
	const response = await apiClient.pages[":handle"].items.upload.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({
					itemId,
					contentType: file.type,
					size: file.size,
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
				body: JSON.stringify({ uploadId: upload.uploadId }),
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

export async function cancelBentoMediaUpload(handle: string, uploadId: string) {
	const response = await apiClient.pages[":handle"].items.upload.cancel.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ uploadId }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok && response.status !== 404) {
		throw new Error(await getApiErrorMessage(response));
	}
}
