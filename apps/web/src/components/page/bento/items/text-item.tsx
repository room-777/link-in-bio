"use client";

import type { PresetName } from "@grabbin/bento-layout";

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
	const verticalAlignClass = {
		bottom: "justify-end",
		center: "justify-center",
		top: "justify-start",
	}[item.style.verticalAlign ?? "top"];
	return (
		<div className="relative flex size-full min-h-0 flex-col gap-3 p-3">
			<div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
				<div
					className={`flex min-h-0 min-w-0 flex-1 flex-col ${verticalAlignClass}`}
				>
					{mode === "edit" ? (
						<textarea
							ref={(element) => {
								if (element && autoFocus) {
									element.focus();
									onAutoFocus?.();
								}
							}}
							value={item.data.text}
							placeholder="Write something..."
							aria-label="Text content"
							className={`no-scrollbar min-h-0 min-w-0 flex-1 resize-none rounded-lg bg-transparent p-1 px-2 text-foreground/90 outline-none ${textSizeClassByPreset[preset]} overflow-y-auto whitespace-pre-wrap placeholder:text-muted-foreground/60`}
							style={{ textAlign: item.style.textAlign ?? "left" }}
							onChange={(event) =>
								onCommand?.({
									type: "update-data",
									itemId: item.id,
									data: { ...item.data, text: event.target.value },
								})
							}
						/>
					) : (
						<div
							className={`no-scrollbar min-h-0 min-w-0 flex-1 rounded-lg bg-transparent p-1 px-2 text-foreground/90 outline-none ${textSizeClassByPreset[preset]} overflow-y-auto whitespace-pre-wrap`}
							style={{ textAlign: item.style.textAlign ?? "left" }}
						>
							{item.data.text}
						</div>
					)}
				</div>
			</div>
			{item.data.link ? (
				<div className="absolute right-4 bottom-4 flex h-fit items-center">
					<ExternalAction href={item.data.link} label="Open text link" />
				</div>
			) : null}
		</div>
	);
}
