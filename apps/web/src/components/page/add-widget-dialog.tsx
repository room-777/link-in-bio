"use client";

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
import { useState } from "react";

function AddWidgetContent() {
	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="outline"
					className="relative col-span-2 aspect-[2/1] h-auto w-full overflow-hidden rounded-2xl p-0"
				>
					<div
						className="pointer-events-none absolute inset-0 overflow-hidden"
						style={{
							maskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom right, black 0%, black 78%, transparent 100%)",
						}}
					>
						<img
							src="/media-widget-sunset.png"
							alt=""
							className="smooth-shadow-sm surface-line pointer-events-none absolute right-[-0.5rem] bottom-[-0.75rem] size-28 rotate-[8deg] rounded-2xl object-cover"
						/>
						<img
							src="/media-widget.png"
							alt=""
							className="smooth-shadow-sm surface-line pointer-events-none absolute right-16 bottom-[-0.25rem] z-10 size-32 rotate-[-6deg] rounded-2xl object-cover"
						/>
					</div>
					<span className="absolute top-3 left-3 z-10 text-base">Media</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="relative aspect-square h-auto w-full rounded-2xl p-0"
				>
					<span className="absolute top-3 left-3 z-10 text-base">Map</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="relative aspect-square h-auto w-full rounded-2xl p-0"
				>
					<span className="absolute top-3 left-3 z-10 text-base">Text</span>
					<div
						className="pointer-events-none absolute inset-0 overflow-hidden"
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
			</div>
			<Field>
				<div className="flex items-center gap-2">
					<div className="smooth-shadow-xs flex aspect-square size-11 items-center justify-center rounded-lg border">
						<Link2
							className="-rotate-45 stroke-[2.5px] text-foreground"
							aria-hidden="true"
						/>
					</div>
					<InputGroup className="h-11 max-w-full grow rounded-lg bg-secondary font-medium text-base">
						<InputGroupInput
							name="widget-link"
							aria-label="Link URL"
							autoComplete="url"
							placeholder="https://example.com"
							className="text-sm"
						/>
						<InputGroupAddon align="inline-end" className="pr-2">
							<Button
								type="button"
								variant="outline"
								size="default"
								className="rounded-md px-3.5 text-primary hover:bg-background"
							>
								Add
							</Button>
						</InputGroupAddon>
					</InputGroup>
				</div>
			</Field>
		</>
	);
}

export default function AddWidgetDialog() {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="default"
				size="icon-lg"
				className="fixed right-6 bottom-6 z-50 size-13 rounded-full"
				aria-label="Open add dialog"
				onClick={() => setOpen(true)}
			>
				<Plus className="size-6 stroke-[2.5]" />
			</Button>
			{isMobile ? (
				<Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
					<DrawerContent className="max-h-[calc(100dvh-2rem)]">
						<DrawerHeader className="p-5 pb-0 text-left">
							<DrawerTitle>Add widget</DrawerTitle>
						</DrawerHeader>
						<div className="flex flex-col gap-6 p-5">
							<AddWidgetContent />
						</div>
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogContent showCloseButton={false} className="gap-6 p-5">
						<DialogHeader className="p-0">
							<DialogTitle>Add widget</DialogTitle>
						</DialogHeader>
						<AddWidgetContent />
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
