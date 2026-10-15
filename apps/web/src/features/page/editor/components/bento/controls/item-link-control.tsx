"use client";

import { useState } from "react";
import LinkControl from "@/features/page/editor/components/bento/controls/link-control";
import type {
	BentoCommand,
	BentoItem,
} from "@/features/page/editor/state/bento-types";
import { createItemLinkCommand } from "@/features/page/editor/state/item-link-command";

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
	const value = isLinkItem ? item.data.url : (item.data.link ?? "");
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
