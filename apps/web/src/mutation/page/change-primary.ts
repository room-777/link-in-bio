import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changePrimaryPage } from "@/api/page/api";
import { OWNED_PAGES_QUERY_KEY } from "@/query/page/owned-pages";

export function useChangePrimaryPage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: changePrimaryPage,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
	});
}
