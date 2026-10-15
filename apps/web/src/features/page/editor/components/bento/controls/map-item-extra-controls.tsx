"use client";

import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { cn } from "@grabbin/ui/lib/utils";
import { Expand, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { MapLocationSearch } from "@/features/page/editor/components/bento/items/map-location-search";
import { useMapItemInteraction } from "@/features/page/editor/contexts/map-item-interaction-provider";

export default function MapItemExtraControls() {
	const {
		setLocationEditing,
		disableLocationSearch,
		zoomIn: handleZoomIn,
		zoomOut: handleZoomOut,
		locate: handleLocate,
		selectLocation,
	} = useMapItemInteraction();
	const [searchOpen, setSearchOpen] = useState(false);
	const [mapControlsOpen, setMapControlsOpen] = useState(false);

	useEffect(() => {
		setLocationEditing(searchOpen || mapControlsOpen);
	}, [mapControlsOpen, searchOpen, setLocationEditing]);

	const keepOpenWhileEditingMap = (details: { reason: string; event: Event }) =>
		details.reason === "outside-press" &&
		details.event.target instanceof Element &&
		details.event.target.closest('[data-bento-item-type="map"]');

	return (
		<>
			<Popover
				open={mapControlsOpen}
				onOpenChange={(open, details) => {
					if (!open && keepOpenWhileEditingMap(details)) {
						details.cancel();
						return;
					}
					setMapControlsOpen(open);
					if (open) setSearchOpen(false);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={
								mapControlsOpen ? "Close map controls" : "Open map controls"
							}
							aria-pressed={mapControlsOpen}
							aria-expanded={mapControlsOpen}
							className={cn(
								"size-8 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60",
								mapControlsOpen &&
									"bg-brand-green! text-white! hover:bg-brand-green!",
							)}
						/>
					}
				>
					<Expand className="size-4 stroke-[2.5px]" aria-hidden="true" />
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					sideOffset={8}
					data-bento-item-drag-cancel="true"
					positionerClassName="z-[100003]"
					className="grid-action smooth-shadow-none! flex w-auto flex-row items-center gap-0.5 rounded-lg border-0 bg-black p-1 shadow-lg"
				>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Zoom out"
						title="Zoom out"
						onClick={handleZoomOut}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<Minus className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Zoom in"
						title="Zoom in"
						onClick={handleZoomIn}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<Plus className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Use current location"
						title="Use current location"
						onClick={handleLocate}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<LocateFixed className="size-4 stroke-[2.5px]" aria-hidden="true" />
					</Button>
				</PopoverContent>
			</Popover>
			<Popover
				open={searchOpen}
				onOpenChange={(open, details) => {
					if (!open && keepOpenWhileEditingMap(details)) {
						details.cancel();
						return;
					}
					setSearchOpen(open);
					if (open) setMapControlsOpen(false);
				}}
			>
				<PopoverTrigger
					render={
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={
								searchOpen ? "Close location search" : "Search location"
							}
							aria-pressed={searchOpen}
							aria-expanded={searchOpen}
							className={cn(
								"size-8 cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-ring/60",
								searchOpen &&
									"bg-brand-green! text-white! hover:bg-brand-green!",
							)}
						/>
					}
				>
					<Search className="size-4 stroke-[2.5px]" aria-hidden="true" />
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					sideOffset={8}
					data-bento-item-drag-cancel="true"
					positionerClassName="z-[100003]"
					className="grid-action w-64 rounded-lg border-0 bg-black p-1 shadow-lg"
				>
					<MapLocationSearch
						accessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
						disabled={disableLocationSearch}
						onSelect={selectLocation}
					/>
				</PopoverContent>
			</Popover>
		</>
	);
}
