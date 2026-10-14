import { useMutation } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function cancelBentoMediaUpload(
	handle: string,
	objectKey: string,
	options: { itemId?: string; kind?: "link-image" } = {},
) {
	const response = await apiClient.pages[":handle"].items.upload.cancel.$post(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({
					objectKey,
					...(options.itemId ? { itemId: options.itemId } : {}),
					...(options.kind ? { kind: options.kind } : {}),
				}),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok && response.status !== 404) {
		throw new Error(await getApiErrorMessage(response));
	}
}

export function useCancelBentoMediaUploadMutation() {
	return useMutation({
		mutationFn: ({
			handle,
			objectKey,
			options,
		}: {
			handle: string;
			objectKey: string;
			options?: { itemId?: string; kind?: "link-image" };
		}) => cancelBentoMediaUpload(handle, objectKey, options),
	});
}
