"use client";

import type { ItemType } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import { Field } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { Link2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useEmailOtpShake } from "@/hooks/use-email-otp-shake";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

import "@grabbin/ui/styles/email-otp-form.css";

const MapWidgetPreview = dynamic(
	() =>
		import("./map-widget-preview").then(({ MapWidgetPreview }) => ({
			default: MapWidgetPreview,
		})),
	{ ssr: false },
);

function AddWidgetContent({
	isOpen,
	onItemAdd,
	onMediaSelect,
}: {
	isOpen: boolean;
	onItemAdd: (itemType: ItemType, url?: string) => void;
	onMediaSelect: (file: File) => void;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [linkValue, setLinkValue] = useState("");
	const [linkError, setLinkError] = useState(false);
	const [shakeKey, setShakeKey] = useState(0);
	const linkInputGroupRef = useEmailOtpShake(shakeKey);

	const addLink = (value: string) => {
		const normalizedUrl = normalizeHttpsUrl(value);
		if (!normalizedUrl) {
			setLinkError(true);
			setShakeKey((key) => key + 1);
			return;
		}

		setLinkError(false);
		setLinkValue("");
		onItemAdd("link", normalizedUrl);
	};

	return (
		<>
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
			<div className="grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="outline"
					className="relative col-span-2 aspect-[2/1] h-auto w-full overflow-hidden rounded-2xl border-border/60 p-0"
					onClick={() => fileInputRef.current?.click()}
				>
					<div
						className="pointer-events-none absolute inset-px overflow-hidden rounded-[calc(var(--radius-2xl)-1px)]"
						style={{
							maskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
						}}
					>
						<div className="smooth-shadow-sm pointer-events-none absolute right-32 bottom-0 size-24 rotate-[-14deg] overflow-hidden rounded-2xl">
							<div className="surface-line relative size-full rounded-2xl outline-depth">
								<img
									src="/media-widget-gas.png"
									alt=""
									className="size-full object-cover"
								/>
							</div>
						</div>
						<div className="smooth-shadow-sm pointer-events-none absolute -right-2 bottom-0 size-28 rotate-[8deg] overflow-hidden rounded-2xl">
							<div className="surface-line relative size-full rounded-2xl outline-depth">
								<img
									src="/media-widget-sunset.png"
									alt=""
									className="size-full object-cover"
								/>
							</div>
						</div>
						<div className="smooth-shadow-sm pointer-events-none absolute right-16 bottom-0 z-10 size-32 rotate-[-6deg] overflow-hidden rounded-2xl">
							<div className="surface-line relative size-full rounded-2xl outline-depth">
								<img
									src="/media-widget.png"
									alt=""
									className="size-full object-cover"
								/>
							</div>
						</div>
					</div>
					<span className="absolute top-3 left-3 z-10 text-base">Media</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="relative aspect-square h-auto w-full overflow-hidden rounded-2xl border-border/60 p-0"
					onClick={() => onItemAdd("map")}
				>
					<div className="smooth-shadow-ring-sm surface-line absolute inset-x-3 top-[40%] aspect-square overflow-hidden rounded-2xl outline-depth">
						{isOpen && <MapWidgetPreview />}
					</div>
					<span className="absolute top-3 left-3 z-10 text-base">Map</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="relative aspect-square h-auto w-full rounded-2xl border-border/60 p-0"
					onClick={() => onItemAdd("text")}
				>
					<span className="absolute top-3 left-3 z-10 text-base">Text</span>
					<div
						className="pointer-events-none absolute inset-px overflow-hidden rounded-[calc(var(--radius-2xl)-1px)]"
						style={{
							maskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
						}}
					>
						<div
							aria-hidden="true"
							className="smooth-shadow-ring absolute right-[-1rem] bottom-[-1rem] size-28 overflow-hidden rounded-2xl bg-background p-2"
						>
							<div className="flex size-full min-w-0 items-start justify-start overflow-hidden break-words rounded-xl bg-secondary/60 p-3 text-left text-primary/70 text-sm leading-snug">
								<p className="min-w-0 max-w-full break-words text-lg leading-tight">
									A little note
									<br />
									about what
									<br />
									matters most.
								</p>
							</div>
						</div>
					</div>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="relative col-span-2 aspect-[4/1] h-auto w-full overflow-hidden rounded-2xl border-border/60 p-0"
					onClick={() => onItemAdd("section")}
				>
					<span className="absolute top-3 left-3 z-10 text-base">Section</span>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-px overflow-hidden rounded-[calc(var(--radius-2xl)-1px)]"
					>
						<div className="absolute top-3 right-3 flex flex-col items-center gap-2">
							<div className="h-4 w-30 rounded-sm bg-black" />
							<div className="smooth-shadow-ring-sm rounded-lg bg-background p-1">
								<div className="size-28 rounded-md bg-secondary" />
							</div>
						</div>
					</div>
				</Button>
			</div>
			<form
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					addLink(linkValue);
				}}
			>
				<Field data-invalid={linkError}>
					<div className="flex items-center gap-2">
						<div className="smooth-shadow-xs flex aspect-square size-11 items-center justify-center rounded-lg border">
							<Link2
								className="-rotate-45 stroke-[2.5px] text-foreground"
								aria-hidden="true"
							/>
						</div>
						<InputGroup
							ref={linkInputGroupRef}
							className="t-input h-11 max-w-full grow rounded-lg bg-secondary font-medium text-base"
						>
							<InputGroupInput
								id="widget-link"
								name="widget-link"
								aria-label="Link URL"
								aria-invalid={linkError}
								autoComplete="url"
								inputMode="url"
								placeholder="Add link..."
								value={linkValue}
								onChange={(event) => {
									setLinkValue(event.target.value);
									setLinkError(false);
								}}
								onPaste={(event) => {
									const pastedValue = event.clipboardData.getData("text");
									if (!pastedValue) return;

									event.preventDefault();
									const input = event.currentTarget;
									const start = input.selectionStart ?? linkValue.length;
									const end = input.selectionEnd ?? linkValue.length;
									const nextValue = `${linkValue.slice(0, start)}${pastedValue}${linkValue.slice(end)}`;
									setLinkValue(nextValue);
									addLink(nextValue);
								}}
								className="text-sm"
							/>
							<InputGroupAddon align="inline-end" className="pr-2">
								<Button
									type="submit"
									variant="outline"
									size="default"
									className="rounded-md px-3.5 font-semibold text-primary hover:bg-background"
								>
									Add
								</Button>
							</InputGroupAddon>
						</InputGroup>
					</div>
				</Field>
			</form>
		</>
	);
}

export default function AddWidgetDialog({
	onItemAdd,
	onMediaSelect,
}: {
	onItemAdd: (itemType: ItemType, url?: string) => void;
	onMediaSelect: (file: File) => void;
}) {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	);
	const handleItemAdd = (itemType: ItemType, url?: string) => {
		onItemAdd(itemType, url);
		setOpen(false);
	};
	const handleMediaSelect = (file: File) => {
		onMediaSelect(file);
		setOpen(false);
	};

	return (
		<>
			<Button
				variant="default"
				size="icon-lg"
				className={`fixed right-6 bottom-10 ${open ? "z-50" : "z-[100004]"} size-13 rounded-full`}
				aria-label="Open add dialog"
				onClick={() => {
					setPortalContainer(
						document.querySelector<HTMLElement>("[data-demo-preview-root]"),
					);
					setOpen(true);
				}}
			>
				<Plus className="size-6 stroke-[2.5]" />
			</Button>
			{isMobile ? (
				<Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
					<DrawerContent keepMounted className="max-h-[calc(100dvh-2rem)]">
						<DrawerHeader className="p-5 pb-0 text-left">
							<DrawerTitle className={"font-medium text-base!"}>
								Add Widget
							</DrawerTitle>
						</DrawerHeader>
						<div className="flex flex-col gap-6 p-5">
							<AddWidgetContent
								isOpen={open}
								onMediaSelect={handleMediaSelect}
								onItemAdd={handleItemAdd}
							/>
						</div>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogContent
						keepMounted
						showCloseButton={false}
						portalContainer={portalContainer ?? undefined}
						className="z-[100003] gap-6 rounded-[2.2rem] p-6"
					>
						<DialogHeader className="p-0 pl-2">
							<DialogTitle className={"font-medium text-base!"}>
								Add Widget
							</DialogTitle>
						</DialogHeader>
						<AddWidgetContent
							isOpen={open}
							onMediaSelect={handleMediaSelect}
							onItemAdd={handleItemAdd}
						/>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
