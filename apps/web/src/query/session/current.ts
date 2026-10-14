import type { Session } from "@grabbin/auth";
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

type SessionWithPage = Session & {
	user: Session["user"] & { pageHandle?: string | null };
};

export function getCurrentSessionQueryOptions(cookie: string | null) {
	return queryOptions({
		queryKey: ["current-session"] as const,
		queryFn: async (): Promise<SessionWithPage | null> => {
			if (!cookie) return null;
			try {
				const client = getServerApiClient() ?? apiClient;
				const response = await client.auth["get-session"].$get(undefined, {
					headers: { cookie },
				});
				if (!response.ok) return null;
				return (await response.json()) as SessionWithPage | null;
			} catch {
				return null;
			}
		},
	});
}
