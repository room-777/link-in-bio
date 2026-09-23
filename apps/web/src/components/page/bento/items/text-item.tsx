"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { useEffect, useRef } from "react";

import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { ExternalAction, textSizeClassByPreset } from "./shared";

export function TextItem({
	item,
	preset,
	mode,
	autoFocus,
	onAutoFocus,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "text" }>;
	preset: PresetName;
	mode: "view" | "edit";
	autoFocus: boolean;
	onAutoFocus?: () => void;
	onCommand?: (command: BentoCommand) => void;
}) {
	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const autoFocusHandledRef = useRef(false);
	useEffect(() => {
		if (!autoFocus) {
			autoFocusHandledRef.current = false;
			return;
		}
		if (autoFocusHandledRef.current) return;
		autoFocusHandledRef.current = true;
		textAreaRef.current?.focus({ preventScroll: true });
		const textArea = textAreaRef.current;
		if (textArea) {
			const caretPosition = textArea.value.length;
			textArea.setSelectionRange(caretPosition, caretPosition);
		}
		onAutoFocus?.();
	}, [autoFocus, onAutoFocus]);
	const verticalAlignClass = {
		bottom: "justify-end",
		center: "justify-center",
		top: "justify-start",
	}[item.style.verticalAlign ?? "top"];
	return (
		<div
			className={`grid-action relative flex size-full min-h-0 flex-col gap-3 overflow-hidden rounded-lg p-3 ${mode === "edit" ? "cursor-grab" : ""}`}
		>
			<div className="relative z-10 flex min-h-0 flex-1 items-stretch justify-between gap-3">
				<div
					className={`flex min-h-0 min-w-0 flex-1 flex-col ${verticalAlignClass}`}
				>
					<textarea
						ref={textAreaRef}
						value={item.data.text}
						placeholder={mode === "edit" ? "Add note..." : undefined}
						aria-label="Text content"
						readOnly={mode === "view"}
						className={`bento-text-input grid-action field-sizing-content max-h-full min-h-0 w-full cursor-text! resize-none overflow-y-auto overscroll-contain whitespace-pre-wrap break-all rounded-lg border-0 bg-transparent p-1 px-2 text-current outline-none placeholder:text-current/45 focus-visible:ring-0 ${textSizeClassByPreset[preset]}`}
						style={{ textAlign: item.style.textAlign ?? "left" }}
						onChange={(event) =>
							onCommand?.({
								type: "update-data",
								itemId: item.id,
								data: { ...item.data, text: event.target.value },
							})
						}
					/>
				</div>
			</div>
			{item.data.link ? (
				<div className="absolute right-4 bottom-4 z-20 flex h-fit items-center">
					<ExternalAction href={item.data.link} label="Open text link" />
				</div>
			) : null}
		</div>
	);
}
