import { pageDomainResponseSchema } from "@grabbin/api";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error-message";
import { getCustomDomainQueryOptions } from "../queries/domain";

async function checkCustomDomain(handle: string) {
	const response = await apiClient.pages[":handle"].domain.check.$post({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageDomainResponseSchema, await response.json());
}

export function useCheckCustomDomain(handle: string | undefined) {
	const queryClient = useQueryClient();
	const queryKey = getCustomDomainQueryOptions(handle).queryKey;

	return useMutation({
		mutationFn: () => {
			if (!handle) throw new Error("Could not find this page.");
			return checkCustomDomain(handle);
		},
		onSuccess: async (result) => {
			queryClient.setQueryData(queryKey, result);
			await queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) =>
			toast({
				message: getErrorMessage(error, "Could not check this domain."),
				state: "error",
			}),
	});
}
