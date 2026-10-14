import { pageItemMetadataResponseSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function refreshBentoLinkMetadata(
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

export function useRefreshBentoLinkMetadataMutation() {
	return useMutation({
		mutationFn: ({
			handle,
			input,
		}: {
			handle: string;
			input: { itemId: string; url: string };
		}) => refreshBentoLinkMetadata(handle, input),
	});
}
