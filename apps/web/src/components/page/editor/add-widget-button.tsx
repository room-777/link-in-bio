"use client";

import type { CalendlyEventType, ItemType } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { useRef, useState } from "react";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";
import AdvancedWidgetsDialog from "./advanced-widgets-dialog";

export type AddWidgetButtonProps = {
	onItemAdd: (itemType: Exclude<ItemType, "calendly">, url?: string) => void;
	onCalendlyAdd: (event: CalendlyEventType) => Promise<void>;
	onRssFeedAdd: (url: string) => Promise<boolean>;
	onMediaSelect: (file: File) => void;
};

export default function AddWidgetButton({
	onItemAdd,
	onCalendlyAdd,
	onRssFeedAdd,
	onMediaSelect,
}: AddWidgetButtonProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
	const [linkValue, setLinkValue] = useState("");
	const [linkError, setLinkError] = useState(false);

	const commitLink = (value: string) => {
		const url = normalizeHttpsUrl(value);
		if (!url) {
			setLinkValue(value);
			setLinkError(true);
			return;
		}

		onItemAdd("link", url);
		setLinkValue("");
		setLinkError(false);
		setLinkPopoverOpen(false);
	};
	const addLink = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		commitLink(linkValue);
	};

	return (
		<div className="flex items-center gap-0.5">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,video/*"
				className="sr-only"
				onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					if (file) onMediaSelect(file);
					event.currentTarget.value = "";
				}}
			/>
			<WidgetButton label="Media" onClick={() => fileInputRef.current?.click()}>
				<span aria-hidden="true">🌄</span>
			</WidgetButton>
			<WidgetButton label="Map" onClick={() => onItemAdd("map")}>
				<span aria-hidden="true">🗺️</span>
			</WidgetButton>
			<WidgetButton label="Text" onClick={() => onItemAdd("text")}>
				<span aria-hidden="true">𝜜</span>
			</WidgetButton>
			<WidgetButton label="Section" onClick={() => onItemAdd("section")}>
				<span aria-hidden="true">🍱</span>
			</WidgetButton>
			<Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
				<PopoverTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-9"
							aria-label="Add link"
							aria-expanded={linkPopoverOpen}
							title="Link"
						/>
					}
				>
					<span aria-hidden="true">🔗</span>
				</PopoverTrigger>
				<PopoverContent
					align="center"
					sideOffset={12}
					className="smooth-shadow-ring-lg! smooth-ring-neutral-300/20! w-72 rounded-lg p-0.5"
				>
					<PopoverTitle className="sr-only">Add link widget</PopoverTitle>
					<form onSubmit={addLink}>
						<InputGroup className="t-input h-10 rounded-lg bg-background font-medium text-base has-[[data-slot=input-group-control]:focus-visible]:ring-0">
							<InputGroupInput
								aria-label="Link URL"
								aria-invalid={linkError}
								autoComplete="url"
								inputMode="url"
								placeholder="Add or paste link"
								value={linkValue}
								onChange={(event) => {
									setLinkValue(event.target.value);
									setLinkError(false);
								}}
								onPaste={(event) => {
									const pastedValue = event.clipboardData.getData("text");
									if (!pastedValue) return;
									event.preventDefault();
									commitLink(pastedValue);
								}}
								className="text-sm placeholder:text-muted-foreground/60"
							/>
							<InputGroupAddon align="inline-end" className="pr-2">
								<Button
									type="submit"
									variant="outline"
									size="sm"
									className="rounded-md px-3 py-4 font-semibold text-primary text-sm hover:bg-background"
								>
									Add
								</Button>
							</InputGroupAddon>
						</InputGroup>
					</form>
				</PopoverContent>
			</Popover>
			<AdvancedWidgetsDialog
				onCalendlyAdd={onCalendlyAdd}
				onRssFeedAdd={onRssFeedAdd}
			/>
		</div>
	);
}

function WidgetButton({
	label,
	children,
	onClick,
}: {
	label: string;
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-9"
			aria-label={`Add ${label.toLowerCase()}`}
			title={label}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}
