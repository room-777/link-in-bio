"use client";

import { getBentoItemRadius, type PresetName } from "@grabbin/bento-layout";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { BentoCommand } from "@/features/page/bento-command";
import type { BentoItem } from "@/features/page/bento-item";
import { ExternalAction } from "./external-action";
import { textSizeClassByPreset } from "./shared";

export default function TextItem({
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
	const viewportRef = useRef<HTMLDivElement>(null);
	const autoFocusHandledRef = useRef(false);
	const verticalAlign =
		preset === "halfBanner" ? "center" : (item.style.verticalAlign ?? "top");
	const itemRadius = getBentoItemRadius(item.type, preset);
	const textAreaRadius = itemRadius - 12;
	const externalUrl = item.data.url;
	useLayoutEffect(() => {
		const textarea = textAreaRef.current;
		const viewport = viewportRef.current;
		if (!textarea || !viewport || textarea.value !== item.data.text) return;

		const alignText = () => {
			textarea.style.paddingTop = "";
			const basePaddingTop = Number.parseFloat(
				getComputedStyle(textarea).paddingTop,
			);
			const previousHeight = textarea.style.height;
			const previousMaxHeight = textarea.style.maxHeight;
			textarea.style.height = "auto";
			textarea.style.maxHeight = "none";
			const contentHeight = textarea.scrollHeight;
			textarea.style.height = previousHeight;
			textarea.style.maxHeight = previousMaxHeight;

			const freeSpace = Math.max(0, textarea.clientHeight - contentHeight);
			const offset =
				verticalAlign === "bottom"
					? freeSpace
					: verticalAlign === "center"
						? freeSpace / 2
						: 0;
			textarea.style.paddingTop = `${basePaddingTop + offset}px`;
		};

		alignText();
		const observer = new ResizeObserver(alignText);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [item.data.text, verticalAlign]);
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
	return (
		<div
			className={`grid-action relative flex size-full min-h-0 flex-col gap-3 overflow-hidden p-3 ${mode === "edit" ? "cursor-grab" : ""}`}
			style={{ borderRadius: itemRadius }}
		>
			<div className="relative z-10 flex min-h-0 flex-1 items-stretch justify-between gap-3">
				<div
					ref={viewportRef}
					className={`flex min-h-0 min-w-0 flex-1 flex-col ${textSizeClassByPreset[preset]}`}
				>
					<textarea
						ref={textAreaRef}
						rows={1}
						value={item.data.text}
						placeholder={mode === "edit" ? "Add note..." : undefined}
						aria-label="Text content"
						readOnly={mode === "view"}
						className={`bento-text-input grid-action h-full max-h-full min-h-0 w-full cursor-text! resize-none overflow-y-auto overscroll-contain whitespace-pre-wrap break-all border-0 bg-transparent px-2 py-0.5 text-current outline-none placeholder:text-current/45 focus-visible:ring-0 ${textSizeClassByPreset[preset]}`}
						style={{
							borderRadius: textAreaRadius,
							textAlign: item.style.textAlign ?? "left",
						}}
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
			{externalUrl ? (
				<div className="absolute right-4 bottom-4 z-20 flex h-fit items-center">
					<ExternalAction href={externalUrl} label="Open text link" />
				</div>
			) : null}
		</div>
	);
}

export { TextItem };
