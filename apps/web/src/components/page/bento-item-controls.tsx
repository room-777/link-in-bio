"use client";

import {
	getAllowedPresets,
	inferPresetFromLayout,
} from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Link2, Unlink2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import BentoPresetIcon from "./bento-preset-icon";

const presetLabels = {
	fullBanner: "Full banner",
	halfBanner: "Half banner",
	squareSmall: "Small square",
	landscape: "Wide",
	squareLarge: "Full square",
	portrait: "Portrait",
} as const;

export default function BentoItemControls({
	item,
	breakpoint,
	onCommand,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	onCommand: (command: BentoCommand) => void;
}) {
	const [linkUrl, setLinkUrl] = useState("");
	const linkItem = item.type === "text" || item.type === "media" ? item : null;
	const currentPreset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);

	useEffect(() => {
		setLinkUrl(linkItem?.data.link ?? "");
	}, [linkItem?.data.link]);

	return (
		<div
			data-bento-item-controls="true"
			data-bento-item-drag-cancel="true"
			className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 flex w-max -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg bg-black p-1 opacity-0 shadow-lg transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/bento-item:pointer-events-auto group-hover/bento-item:opacity-100 motion-reduce:transition-none"
		>
			{getAllowedPresets(item.type).map((preset) => (
				<Button
					key={preset}
					type="button"
					size="icon-sm"
					variant={currentPreset === preset ? "secondary" : "ghost"}
					aria-label={presetLabels[preset]}
					title={presetLabels[preset]}
					className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
					onClick={() =>
						onCommand({
							type: "apply-preset",
							itemId: item.id,
							breakpoint,
							preset,
						})
					}
				>
					<BentoPresetIcon preset={preset} />
				</Button>
			))}
			{linkItem ? (
				<InputGroup className="h-7 w-40 rounded-md bg-transparent text-white has-[[data-slot=input-group-control]:focus-visible]:ring-0">
					{linkUrl ? (
						<Link2 className="ml-1 size-3.5" />
					) : (
						<Unlink2 className="ml-1 size-3.5" />
					)}
					<InputGroupInput
						value={linkUrl}
						placeholder="Add link"
						aria-label="Item link"
						className="h-7 px-1 text-white placeholder:text-white/60"
						onChange={(event) => {
							const value = event.target.value;
							setLinkUrl(value);
							onCommand({
								type: "update-data",
								itemId: item.id,
								data: { ...item.data, link: value.trim() || undefined },
							});
						}}
					/>
				</InputGroup>
			) : null}
		</div>
	);
}
