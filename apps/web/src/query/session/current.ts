import type { Session } from "@grabbin/auth";
import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getServerFetch } from "@/lib/server/api-client";

type SessionWithPrimaryPage = Session & {
	user: Session["user"] & { primaryPageHandle?: string | null };
};

export function getCurrentSessionQueryOptions(cookie: string | null) {
	return queryOptions({
		queryKey: ["current-session"] as const,
		queryFn: async (): Promise<SessionWithPrimaryPage | null> => {
			if (!cookie) return null;
			try {
				const { data } = await authClient.getSession({
					fetchOptions: {
						headers: { cookie },
						customFetchImpl: getServerFetch(),
					},
				});
				return (data as SessionWithPrimaryPage | null) ?? null;
			} catch {
				return null;
			}
		},
	});
}
