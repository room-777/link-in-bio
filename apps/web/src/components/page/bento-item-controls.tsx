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
import { toast } from "@grabbin/ui/components/toast";
import { ChevronLeft, Crop, Link2, RefreshCw, Unlink2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { BentoCommand, BentoItem } from "@/lib/bento/bento-types";
import { useOptionalMediaCrop } from "./bento/items/media-crop-context";
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
	onRefreshLinkMetadata,
}: {
	item: BentoItem;
	breakpoint: "wide" | "compact";
	onCommand: (command: BentoCommand) => void;
	onRefreshLinkMetadata?: (itemId: string) => Promise<void>;
}) {
	const [linkUrl, setLinkUrl] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [view, setView] = useState<"toolbar" | "link">("toolbar");
	const linkValue =
		item.type === "link"
			? item.data.url
			: item.type === "text" || item.type === "media"
				? (item.data.link ?? "")
				: null;
	const currentPreset = inferPresetFromLayout(
		item.type,
		item.layouts[breakpoint],
		breakpoint,
	);
	const mediaCrop = useOptionalMediaCrop();

	useEffect(() => {
		if (view === "link") setLinkUrl(linkValue ?? "");
	}, [linkValue, view]);

	const commitLink = () => {
		const value = linkUrl.trim();
		if (item.type === "link") {
			try {
				if (new URL(value).protocol !== "https:") throw new Error();
			} catch {
				toast({ message: "Enter a valid HTTPS link.", state: "error" });
				return;
			}
			if (value === item.data.url) return;
			onCommand({
				type: "update-data",
				itemId: item.id,
				data: { url: value },
			});
			return;
		}

		if (item.type !== "text" && item.type !== "media") return;
		if (!value) {
			onCommand({
				type: "update-data",
				itemId: item.id,
				data: { ...item.data, link: undefined },
			});
			return;
		}
		try {
			if (new URL(value).protocol !== "https:") throw new Error();
		} catch {
			toast({ message: "Enter a valid HTTPS link.", state: "error" });
			return;
		}
		if (value === item.data.link) return;
		onCommand({
			type: "update-data",
			itemId: item.id,
			data: { ...item.data, link: value },
		});
	};

	const refreshMetadata = async () => {
		if (!onRefreshLinkMetadata || item.type !== "link") return;
		setIsRefreshing(true);
		try {
			await onRefreshLinkMetadata(item.id);
		} catch {
			// The store exposes the save/refresh error in the editor status.
		} finally {
			setIsRefreshing(false);
		}
	};

	const closeLinkView = () => {
		setLinkUrl("");
		setView("toolbar");
	};

	const openLinkView = () => {
		setLinkUrl(linkValue ?? "");
		setView("link");
	};

	return (
		<div
			data-bento-item-controls="true"
			data-bento-item-drag-cancel="true"
			className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 flex h-10 w-max -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-lg bg-black p-1 opacity-0 shadow-lg transition-opacity duration-150 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/bento-item:pointer-events-auto group-hover/bento-item:opacity-100 motion-reduce:transition-none"
		>
			{view === "link" && linkValue !== null ? (
				<div className="flex min-w-0 items-center gap-0">
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Back to controls"
						className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
						onClick={closeLinkView}
					>
						<ChevronLeft className="size-5" />
					</Button>
					<InputGroup className="h-8 w-52 rounded-full bg-transparent text-white has-[[data-slot=input-group-control]:focus-visible]:ring-0">
						{linkUrl ? (
							<Link2 className="ml-1 size-3.5" />
						) : (
							<Unlink2 className="ml-1 size-3.5" />
						)}
						<InputGroupInput
							value={linkUrl}
							placeholder="Paste a link"
							aria-label="Link URL"
							className="px-1 text-white placeholder:text-white/60"
							onChange={(event) => setLinkUrl(event.target.value)}
							onBlur={commitLink}
							onKeyDown={(event) => {
								if (event.key === "Enter") event.currentTarget.blur();
								if (event.key === "Escape") {
									event.preventDefault();
									closeLinkView();
								}
							}}
							autoFocus
							autoComplete="off"
						/>
					</InputGroup>
					{item.type === "link" && onRefreshLinkMetadata ? (
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label="Refresh link metadata"
							title="Refresh link metadata"
							disabled={isRefreshing}
							className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
							onClick={() => void refreshMetadata()}
						>
							<RefreshCw
								className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"}
							/>
						</Button>
					) : null}
				</div>
			) : (
				<>
					{item.type === "media" && item.data.mediaUrl && mediaCrop ? (
						mediaCrop.isOpen ? (
							<>
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									aria-label="Cancel media crop"
									title="Cancel media crop"
									className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
									onClick={mediaCrop.cancel}
								>
									<X className="size-4 stroke-[3]" />
								</Button>
								<Button
									type="button"
									size="icon-sm"
									variant="secondary"
									aria-label="Apply media crop"
									title="Apply media crop"
									disabled={!mediaCrop.canApply}
									className="cursor-pointer! rounded-md"
									onClick={mediaCrop.apply}
								>
									<Crop className="size-4" />
								</Button>
							</>
						) : (
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								aria-label="Crop media"
								title="Crop media"
								className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
								onClick={mediaCrop.open}
							>
								<Crop className="size-4" />
							</Button>
						)
					) : null}
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
					{linkValue !== null ? (
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={
								item.type === "link" ? "Edit link URL" : "Manage link"
							}
							title={item.type === "link" ? "Edit link URL" : "Manage link"}
							className="cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
							onClick={openLinkView}
						>
							{linkValue ? (
								<Link2 className="size-4 stroke-[3]" />
							) : (
								<Unlink2 className="size-4 stroke-[3]" />
							)}
						</Button>
					) : null}
				</>
			)}
		</div>
	);
}
