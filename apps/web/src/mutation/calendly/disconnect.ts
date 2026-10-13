import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { calendlyConnectionQueryKey } from "@/query/calendly/connection";

async function disconnectCalendly() {
	const response = await apiClient.auth.calendly.disconnect.$post();
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
}

export function useDisconnectCalendlyMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: disconnectCalendly,
		onSuccess: () =>
			queryClient.setQueryData(calendlyConnectionQueryKey, {
				connected: false,
			}),
	});
}
