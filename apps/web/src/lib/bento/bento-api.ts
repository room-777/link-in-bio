import {
	type PageItemBatchRequest,
	pageItemBatchResponseSchema,
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

export async function uploadBentoMedia(handle: string, file: File) {
	const response = await apiClient.pages[":handle"].items.upload.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ contentType: file.type, size: file.size }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	const upload = v.parse(pageItemUploadResponseSchema, await response.json());
	const uploadResponse = await fetch(upload.uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": file.type },
		body: file,
	});
	if (!uploadResponse.ok) throw new Error("The media upload failed.");

	const completeResponse = await apiClient.pages[
		":handle"
	].items.upload.complete.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ objectKey: upload.objectKey }),
				headers: { "Content-Type": "application/json" },
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
