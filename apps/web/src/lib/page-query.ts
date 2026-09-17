import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export const pageQueryKey = (handle: string) => ["page", handle] as const;

export function pageQueryOptions(
	handle: string,
	headers?: Record<string, string>,
) {
	return {
		queryKey: pageQueryKey(handle),
		queryFn: async () => {
			const response = await apiClient.pages[":handle"].$get(
				{ param: { handle } },
				headers ? { headers } : undefined,
			);

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(await getApiErrorMessage(response));
			}

			const body = await response.json();
			return "page" in body ? body.page : null;
		},
	};
}
