import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changePageHandle } from "@/api/page/api";
import { PAGE_HANDLE_CHECK_QUERY_KEY_PREFIX } from "@/query/page-handle/check";

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
