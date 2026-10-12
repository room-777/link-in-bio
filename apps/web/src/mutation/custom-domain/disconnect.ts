import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disconnectCustomDomain } from "@/api/custom-domain/api";
import { getErrorMessage } from "@/lib/error-message";
import { getCustomDomainQueryOptions } from "@/query/custom-domain/query";

export function useDisconnectCustomDomain(handle: string | undefined) {
	const queryClient = useQueryClient();
	const queryKey = getCustomDomainQueryOptions(handle).queryKey;

	return useMutation({
		mutationFn: () => {
			if (!handle) throw new Error("Could not find this page.");
			return disconnectCustomDomain(handle);
		},
		onSuccess: async (result) => {
			queryClient.setQueryData(queryKey, result);
			await queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) =>
			toast({
				message: getErrorMessage(error, "Could not disconnect this domain."),
				state: "error",
			}),
	});
}
