import type { PageItemBatchRequest } from "@grabbin/api";
import { pageItemBatchResponseSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

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

export function usePatchBentoItemsMutation() {
	return useMutation({
		mutationFn: ({
			handle,
			batch,
		}: {
			handle: string;
			batch: PageItemBatchRequest;
		}) => patchBentoBatch(handle, batch),
	});
}
