import type { Session } from "@grabbin/auth";

export type SessionWithPage = Session & {
	user: Session["user"] & { pageHandle?: string | null };
};

export function getOwnPagePath(session: SessionWithPage | null) {
	return session?.user.pageHandle
		? `/${encodeURIComponent(session.user.pageHandle)}`
		: "/create";
}
