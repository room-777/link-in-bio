import { env } from "cloudflare:workers";
import type { Session } from "@grabbin/auth";
import { env as webEnv } from "@grabbin/env/web";
import { headers } from "next/headers";
import { cache } from "react";

export type SessionWithPrimaryPage = Session & {
	user: Session["user"] & { primaryPageHandle?: string | null };
};

export const getServerSession = cache(
	async (): Promise<SessionWithPrimaryPage | null> => {
		const cookie = (await headers()).get("cookie");
		const server = (env as { SERVER?: Fetcher }).SERVER;
		if (!cookie) return null;

		let response: Response;
		try {
			response = server
				? await server.fetch(
						new Request("https://server/auth/get-session", {
							headers: { cookie },
						}),
					)
				: await fetch(
						new URL("/auth/get-session", webEnv.NEXT_PUBLIC_SERVER_URL),
						{ headers: { cookie } },
					);
		} catch {
			return null;
		}
		if (!response.ok) return null;

		return (await response.json()) as SessionWithPrimaryPage | null;
	},
);

export function getPrimaryPagePath(session: SessionWithPrimaryPage | null) {
	return session?.user.primaryPageHandle
		? `/${encodeURIComponent(session.user.primaryPageHandle)}`
		: "/create";
}
