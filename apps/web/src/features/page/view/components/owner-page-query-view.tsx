"use client";

import OwnerPage from "@/components/page/editor/owner-page";
import { useSuspensePageByHandleQuery } from "../queries/by-handle";

export function OwnerPageQueryView({ handle }: { handle: string }) {
	const pageResponse = useSuspensePageByHandleQuery(handle);
	return <OwnerPage pageResponse={pageResponse} />;
}
