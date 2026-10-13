"use client";

import { useEffect, useRef } from "react";
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
	const inputRef = useRef<HTMLInputElement>(null);
	const autoFocusHandledRef = useRef(false);
	useEffect(() => {
		if (!autoFocus) {
			autoFocusHandledRef.current = false;
			return;
		}
		if (autoFocusHandledRef.current) return;
		autoFocusHandledRef.current = true;
		inputRef.current?.focus({ preventScroll: true });
		const input = inputRef.current;
		if (input) {
			const caretPosition = input.value.length;
			input.setSelectionRange(caretPosition, caretPosition);
		}
		onAutoFocus?.();
	}, [autoFocus, onAutoFocus]);
	return mode === "edit" ? (
		<div className="flex size-full items-center overflow-hidden p-3">
			<input
				ref={inputRef}
				value={item.data.title}
				placeholder="Add title..."
				aria-label="Section title"
				className="grid-action field-sizing-content h-full w-fit min-w-32 max-w-full overflow-hidden truncate rounded-lg bg-transparent px-2 font-semibold text-xl tracking-tight outline-none placeholder:text-muted-foreground hover:bg-secondary focus-visible:bg-secondary"
				onChange={(event) =>
					onCommand?.({
						type: "update-data",
						itemId: item.id,
						data: { ...item.data, title: event.target.value },
					})
				}
			/>
		</div>
	) : (
		<div className="flex size-full items-center overflow-hidden p-3">
			<h2 className="flex h-full w-full min-w-32 max-w-full items-center truncate rounded-2xl px-2 font-semibold text-xl tracking-tight">
				{item.data.title}
			</h2>
		</div>
	);
}
