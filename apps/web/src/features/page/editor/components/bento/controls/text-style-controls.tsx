"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@grabbin/ui/components/radio-group";
import { Separator } from "@grabbin/ui/components/separator";
import { cn } from "@grabbin/ui/lib/utils";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	AlignVerticalJustifyCenter,
	AlignVerticalJustifyEnd,
	AlignVerticalJustifyStart,
	Ellipsis,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { BentoItem } from "@/features/page/bento-item";
import type { BentoCommand } from "@/features/page/editor/types";
import { createItemLinkCommand } from "@/features/page/editor/utils/item-link-command";
import LinkControl from "./link-control";

const backgroundColorOptions = [
	{ id: "white", label: "White", value: "#ffffff", className: "bg-white" },
	{ id: "gray", label: "Gray", value: "#d4d4d4", className: "bg-neutral-300" },
	{ id: "black", label: "Black", value: "#000000", className: "bg-black" },
	{ id: "red", label: "Red", value: "#ef4444", className: "bg-red-500" },
	{
		id: "orange",
		label: "Orange",
		value: "#f97316",
		className: "bg-orange-500",
	},
	{
		id: "yellow",
		label: "Yellow",
		value: "#eab308",
		className: "bg-yellow-500",
	},
	{ id: "green", label: "Green", value: "#22c55e", className: "bg-green-500" },
	{ id: "blue", label: "Blue", value: "#3b82f6", className: "bg-blue-500" },
	{
		id: "indigo",
		label: "Indigo",
		value: "#6366f1",
		className: "bg-indigo-500",
	},
	{
		id: "violet",
		label: "Violet",
		value: "#8b5cf6",
		className: "bg-violet-500",
	},
] as const;

function normalizeHexColor(value: string) {
	const match = value
		.trim()
		.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (!match) return null;
	const hex = match[1]?.toLowerCase();
	if (!hex) return null;
	return hex.length === 3 || hex.length === 4
		? `#${hex
				.split("")
				.map((character) => `${character}${character}`)
				.join("")}`
		: `#${hex}`;
}

export default function TextStyleControls({
	item,
	preset,
	onCommand,
}: {
	item: Extract<BentoItem, { type: "text" }>;
	preset: PresetName | null;
	onCommand: (command: BentoCommand) => void;
}) {
	const [open, setOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [draftColor, setDraftColor] = useState(
		item.style.backgroundColor ?? "#ffffff",
	);
	const backgroundColor = item.style.backgroundColor ?? "#ffffff";
	const verticalAlign =
		item.style.verticalAlign ?? (preset === "halfBanner" ? "center" : "top");
	const selectedColor = backgroundColorOptions.find(
		(option) => option.value === backgroundColor,
	);

	useEffect(() => {
		setDraftColor(backgroundColor);
	}, [backgroundColor]);

	const updateStyle = (patch: BentoItem["style"]) =>
		onCommand({ type: "update-style", itemId: item.id, patch });
	const manageLink = (value: string) => {
		const command = createItemLinkCommand(item, value);
		if (command) onCommand(command);
	};
	const handleCommitColor = () => {
		const color = normalizeHexColor(draftColor);
		if (color && color !== backgroundColor)
			updateStyle({ backgroundColor: color });
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setPaletteOpen(false);
			}}
		>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={open}
						aria-label="Open text style options"
						className="size-8 cursor-pointer! rounded-md border-0 bg-transparent p-0 text-primary-foreground shadow-none hover:bg-primary-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				<Ellipsis className="size-4 stroke-[2.5px]" aria-hidden="true" />
			</PopoverTrigger>
			<PopoverContent
				align="center"
				side="bottom"
				sideOffset={8}
				positionerClassName="z-[100003]"
				className="grid-action flex w-auto flex-col gap-2 overflow-hidden rounded-lg border-0 bg-foreground p-1 shadow-lg"
			>
				<div className="flex items-center gap-1">
					<fieldset
						className="flex items-center gap-1 border-0 p-0"
						aria-label="Text alignment"
					>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text left"
							aria-pressed={
								item.style.textAlign === "left" || !item.style.textAlign
							}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "left" })}
						>
							<AlignLeft className="size-4 stroke-[2.5px]" aria-hidden="true" />
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text center"
							aria-pressed={item.style.textAlign === "center"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "center" })}
						>
							<AlignCenter
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text right"
							aria-pressed={item.style.textAlign === "right"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ textAlign: "right" })}
						>
							<AlignRight
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
					</fieldset>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<fieldset
						className="flex items-center gap-1 border-0 p-0"
						aria-label="Vertical alignment"
					>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the top"
							aria-pressed={verticalAlign === "top"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "top" })}
						>
							<AlignVerticalJustifyStart
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the center"
							aria-pressed={verticalAlign === "center"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "center" })}
						>
							<AlignVerticalJustifyCenter
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Align text to the bottom"
							aria-pressed={verticalAlign === "bottom"}
							className="size-8 rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary aria-pressed:bg-primary-foreground aria-pressed:text-primary"
							onClick={() => updateStyle({ verticalAlign: "bottom" })}
						>
							<AlignVerticalJustifyEnd
								className="size-4 stroke-[2.5px]"
								aria-hidden="true"
							/>
						</Button>
					</fieldset>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-expanded={paletteOpen}
						aria-label="Toggle text background color options"
						className="size-8 rounded-sm border-0 bg-transparent p-1 text-primary-foreground shadow-none hover:bg-background/30 focus-visible:ring-2 focus-visible:ring-ring/60"
						onClick={() => setPaletteOpen((current) => !current)}
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-full rounded-full border border-white/20",
								selectedColor?.className,
							)}
							style={{ backgroundColor }}
						/>
					</Button>
					<Separator
						orientation="vertical"
						className="rounded-lg bg-background/30 data-vertical:my-2 data-vertical:w-[2.5px]"
					/>
					<LinkControl
						value={item.data.url ?? ""}
						onCommit={manageLink}
						ariaLabel={item.data.url ? "Edit text link" : "Add text link"}
						inputBackground="bg-transparent"
					/>
				</div>
				{paletteOpen ? (
					<div className="flex flex-col gap-2 border-white/10 border-t">
						<RadioGroup
							aria-label="Text background color options"
							className="grid grid-cols-8 gap-1 p-1 pt-1.5"
							onValueChange={(value) => {
								const option = backgroundColorOptions.find(
									(candidate) => candidate.id === value,
								);
								if (!option) return;
								setDraftColor(option.value);
								updateStyle({ backgroundColor: option.value });
							}}
							value={selectedColor?.id ?? ""}
						>
							{backgroundColorOptions.map((option) => (
								<RadioGroupItem
									key={option.id}
									value={option.id}
									aria-label={option.label}
									className={cn(
										"size-7 shrink-0 cursor-pointer rounded-full border border-white/20 shadow-none transition-[transform,opacity] focus-visible:ring-2 focus-visible:ring-ring/50 data-checked:ring-2 data-checked:ring-white/90 [&_[data-slot=radio-group-indicator]]:hidden",
										option.className,
									)}
									style={{ backgroundColor: option.value }}
								/>
							))}
						</RadioGroup>
						<Input
							aria-label="Text background hex color"
							aria-invalid={
								draftColor.trim().length > 0 && !normalizeHexColor(draftColor)
							}
							value={draftColor}
							placeholder="#ffffff"
							className="h-8 border-white/10 bg-background/10 px-2 font-mono text-primary-foreground text-xs shadow-none focus-visible:ring-white/20"
							onChange={(event) => setDraftColor(event.target.value)}
							onBlur={handleCommitColor}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									handleCommitColor();
								}
								if (event.key === "Escape") setDraftColor(backgroundColor);
							}}
						/>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
