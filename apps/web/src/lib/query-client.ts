import {
	defaultShouldDehydrateQuery,
	environmentManager,
	type Query,
	QueryClient,
} from "@tanstack/react-query";

const defaultOptions = {
	queries: {
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: "always" as const,
		retry: 2,
		retryDelay: (attemptIndex: number) =>
			Math.min(1_000 * 2 ** attemptIndex, 30_000),
	},
	mutations: {
		retry: 0,
	},
	dehydrate: {
		shouldDehydrateQuery: (query: Query) =>
			defaultShouldDehydrateQuery(query) || query.state.status === "pending",
		shouldRedactErrors: () => false,
	},
};

export function makeQueryClient() {
	return new QueryClient({ defaultOptions });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
	if (environmentManager.isServer()) {
		return makeQueryClient();
	}

	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}

	return browserQueryClient;
}
