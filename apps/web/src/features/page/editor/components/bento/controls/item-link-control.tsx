"use client";

import { useState } from "react";
import type { BentoItem } from "@/features/page/bento-item";
import LinkControl from "@/features/page/editor/components/bento/controls/link-control";
import type { BentoCommand } from "@/features/page/editor/types";
import { createItemLinkCommand } from "@/features/page/editor/utils/item-link-command";

type LinkItem = Extract<BentoItem, { type: "link" | "media" }>;

export default function ItemLinkControl({
	item,
	onCommand,
	onRefreshLinkMetadata,
}: {
	item: LinkItem;
	onCommand: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
}) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const isLinkItem = item.type === "link";
	const value = item.data.url ?? "";
	const ariaLabel = isLinkItem
		? "Edit link URL"
		: value
			? "Edit media link"
			: "Add media link";
	const commitLink = (nextUrl: string) => {
		const command = createItemLinkCommand(item, nextUrl);
		if (command) onCommand(command);
	};
	const refreshMetadata =
		isLinkItem && onRefreshLinkMetadata
			? async () => {
					setIsRefreshing(true);
					try {
						await onRefreshLinkMetadata(item.id);
					} catch {
						// The store reports refresh failures with a toast.
					} finally {
						setIsRefreshing(false);
					}
				}
			: undefined;

	return (
		<LinkControl
			value={value}
			onCommit={commitLink}
			ariaLabel={ariaLabel}
			allowEmpty={!isLinkItem}
			inputBackground="bg-transparent"
			onRefresh={refreshMetadata}
			isRefreshing={isRefreshing}
		/>
	);
}
