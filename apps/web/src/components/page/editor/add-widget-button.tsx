"use client";

import type { ItemType } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import { useRef } from "react";

export type AddWidgetButtonProps = {
	onItemAdd: (itemType: ItemType, url?: string) => void;
	onMediaSelect: (file: File) => void;
};

export default function AddWidgetButton({
	onItemAdd,
	onMediaSelect,
}: AddWidgetButtonProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

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
			<WidgetButton
				label="Link"
				onClick={() => {
					const url = window.prompt("Enter a link URL.");
					if (url?.trim()) onItemAdd("link", url);
				}}
			>
				<span aria-hidden="true">🔗</span>
			</WidgetButton>
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
