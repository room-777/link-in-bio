"use client";

import { useRouter } from "next/navigation";
import { useChangePageHandle } from "@/mutation/page/change-handle";
import { PageHandleForm } from "./page-handle-form";

export default function ChangeHandleDialog({
	handle,
	onHandleChange,
	onClose,
	compact,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
	onClose: () => void;
	compact: boolean;
}) {
	const router = useRouter();
	const changePageHandle = useChangePageHandle();

	const handleChange = async (nextHandle: string) => {
		if (!handle) throw new Error("Please try again.");
		const changedHandle = await changePageHandle.mutateAsync({
			handle,
			nextHandle,
		});

		onClose();
		if (onHandleChange) {
			onHandleChange(changedHandle);
		} else {
			router.replace(`/${encodeURIComponent(changedHandle)}`);
		}
	};

	return (
		<PageHandleForm
			initialHandle={handle}
			title="Change your handle"
			description="Choose a new handle for your page."
			submitLabel="Change handle"
			variant="outline"
			compact={compact}
			layoutClassName={compact ? "justify-between" : undefined}
			onSubmit={handleChange}
		/>
	);
}
