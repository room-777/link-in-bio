import { pageImageKeySchema } from "@grabbin/api";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function uploadPageProfileImageToStorage(uploadUrl: string, file: File) {
	const response = await fetch(uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": file.type },
		body: file,
	});
	if (!response.ok) throw new Error("The image upload failed.");
}

export async function uploadPageProfileImage(handle: string, file: File) {
	const response = await apiClient.pages[":handle"]["profile-image"][
		"upload-url"
	].$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ contentType: file.type, size: file.size }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));

	const upload = await response.json();
	if (!("key" in upload && "uploadUrl" in upload)) {
		throw new Error("Please try again.");
	}

	try {
		await uploadPageProfileImageToStorage(upload.uploadUrl, file);
	} catch (error) {
		await cleanupUploadedPageProfileImage(handle, upload.key);
		throw error;
	}

	return upload.key;
}

export async function cleanupUploadedPageProfileImage(
	handle: string,
	key: string,
) {
	const parsed = v.safeParse(pageImageKeySchema, { key });
	if (!parsed.success) return;

	await apiClient.pages[":handle"]["profile-image"]
		.$delete(
			{ param: { handle } },
			{
				init: {
					body: JSON.stringify(parsed.output),
					headers: { "Content-Type": "application/json" },
				},
			},
		)
		.catch(() => undefined);
}
