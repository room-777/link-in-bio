import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { OWNED_PAGES_QUERY_KEY } from "@/query/page/owned-pages";

async function deletePage(handle: string) {
	const response = await apiClient.pages[":handle"].$delete({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
}

export function useDeletePage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deletePage,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
	});
}
