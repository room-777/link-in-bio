import { useMutation } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { cleanupUploadedPageProfileImage } from "./cleanup";

async function uploadPageProfileImage(handle: string, file: File) {
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
		const uploadResponse = await fetch(upload.uploadUrl, {
			method: "PUT",
			headers: { "Content-Type": file.type },
			body: file,
		});
		if (!uploadResponse.ok) throw new Error("The image upload failed.");
	} catch (error) {
		await cleanupUploadedPageProfileImage(handle, upload.key);
		throw error;
	}

	return upload.key;
}

export function useUploadPageProfileImageMutation() {
	return useMutation({
		mutationFn: ({ handle, file }: { handle: string; file: File }) =>
			uploadPageProfileImage(handle, file),
	});
}
