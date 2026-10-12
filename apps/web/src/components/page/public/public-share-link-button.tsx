"use client";

import { Button } from "@grabbin/ui/components/button";
import { QrCode } from "lucide-react";
import { openShareLinkDialog } from "../sharing/share-link-dialog";

export default function PublicShareLinkButton({
	profileImageUrl,
}: {
	profileImageUrl: string | null;
}) {
	return (
		<>
			<Button
				type="button"
				variant="default"
				size="icon-lg"
				className="fixed right-6 bottom-9 z-50 page-wide:hidden size-15 rounded-full"
				aria-label="Share link"
				onClick={() => openShareLinkDialog(profileImageUrl, true)}
			>
				<QrCode className="size-6" aria-hidden="true" />
			</Button>
		</>
	);
}
