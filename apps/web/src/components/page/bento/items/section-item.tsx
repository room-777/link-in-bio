"use client";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";

export function SectionItem({
	item,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "section" }>;
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
}) {
	return (
		<div className="flex size-full items-center overflow-hidden p-3">
			{mode === "edit" ? (
				<input
					ref={(element) => {
						if (element && autoFocus) {
							element.focus();
							onAutoFocus?.();
						}
					}}
					value={item.data.title}
					placeholder="Section title"
					aria-label="Section title"
					className="w-full min-w-0 truncate bg-transparent px-2 font-semibold text-xl leading-11 outline-none placeholder:text-muted-foreground/60"
					onChange={(event) =>
						onCommand?.({
							type: "update-data",
							itemId: item.id,
							data: { ...item.data, title: event.target.value },
						})
					}
				/>
			) : (
				<p className="line-clamp-1 w-full min-w-0 truncate px-2 font-semibold text-xl leading-11">
					{item.data.title}
				</p>
			)}
		</div>
	);
}
