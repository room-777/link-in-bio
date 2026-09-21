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
import { Image, Link2, Map as MapIcon, Plus, Type } from "lucide-react";
import { useState } from "react";

function AddWidgetContent() {
	return (
		<>
			<div className="grid grid-cols-3 gap-2">
				<Button
					type="button"
					variant="outline"
					className="aspect-square h-auto w-full flex-col gap-2"
				>
					<Image aria-hidden="true" />
					<span>Media</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="aspect-square h-auto w-full flex-col gap-2"
				>
					<MapIcon aria-hidden="true" />
					<span>Map</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="aspect-square h-auto w-full flex-col gap-2"
				>
					<Type aria-hidden="true" />
					<span>Text</span>
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
