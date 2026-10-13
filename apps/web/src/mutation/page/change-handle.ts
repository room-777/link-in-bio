import { pageHandleResponseSchema } from "@grabbin/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX } from "@/query/page-handle/check";

async function changePageHandle(handle: string, nextHandle: string) {
	const response = await apiClient.pages[":handle"].handle.$patch(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify({ handle: nextHandle }),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageHandleResponseSchema, await response.json()).page.handle;
}

export function useChangePageHandle() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			handle,
			nextHandle,
		}: {
			handle: string;
			nextHandle: string;
		}) => changePageHandle(handle, nextHandle),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX,
			}),
	});
}
