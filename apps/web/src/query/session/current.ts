import type { Session } from "@grabbin/auth";
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getServerApiClient } from "@/lib/server/api-client";

type SessionWithPrimaryPage = Session & {
	user: Session["user"] & { primaryPageHandle?: string | null };
};

export function getCurrentSessionQueryOptions(cookie: string | null) {
	return queryOptions({
		queryKey: ["current-session"] as const,
		queryFn: async (): Promise<SessionWithPrimaryPage | null> => {
			if (!cookie) return null;
			try {
				const client = getServerApiClient() ?? apiClient;
				const response = await client.auth["*"].$get(
					{ param: { "*": "get-session" } },
					{ headers: { cookie } },
				);
				if (!response.ok) return null;
				return (await response.json()) as SessionWithPrimaryPage | null;
			} catch {
				return null;
			}
		},
	});
}
