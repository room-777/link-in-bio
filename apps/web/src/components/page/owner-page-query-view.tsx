"use client";

import { useSuspensePageByHandleQuery } from "@/query/page/by-handle";
import OwnerPage from "./editor/owner-page";

export function OwnerPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <OwnerPage pageResponse={pageResponse} />;
}
