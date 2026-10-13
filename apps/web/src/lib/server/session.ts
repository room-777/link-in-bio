import type { Session } from "@grabbin/auth";

export type SessionWithPrimaryPage = Session & {
	user: Session["user"] & { primaryPageHandle?: string | null };
};

export function getPrimaryPagePath(session: SessionWithPrimaryPage | null) {
	return session?.user.primaryPageHandle
		? `/${encodeURIComponent(session.user.primaryPageHandle)}`
		: "/create";
}
