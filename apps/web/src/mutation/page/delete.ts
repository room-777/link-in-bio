import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePage } from "@/api/page/api";
import { OWNED_PAGES_QUERY_KEY } from "@/query/page/owned-pages";

export function useDeletePage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deletePage,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
	});
}
