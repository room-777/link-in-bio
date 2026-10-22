"use client";

import { providerDefinitions } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "@grabbin/ui/components/item";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import { ScrollArea } from "@grabbin/ui/components/scroll-area";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { type CSSProperties, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
	CalendlyConnectionError,
	useCalendlyConnectionQuery,
} from "../../queries/connection";
import { useCalendlyEventsQuery } from "../../queries/events";
import CalendlyConnectButton from "../calendly-connect-button";

const calendlyBrandColor = providerDefinitions.find(
	(provider) => provider.id === "calendly",
)?.theme?.faviconBackground;
const calendlyEventsScrollAreaClassName =
	"[&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scrollbar-none h-full min-h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden";

function formatSessionDuration(minutes: number | null) {
	if (!minutes || minutes < 1) return "Duration unavailable";
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatTimeZoneOffset(timeZone: string) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone,
		timeZoneName: "shortOffset",
	})
		.formatToParts(new Date())
		.find((part) => part.type === "timeZoneName")?.value;
}

export default function CalendlyWidgetDetails({
	onAdd,
}: {
	onAdd: (event: import("@grabbin/api").CalendlyEventType) => Promise<void>;
}) {
	const { data: session } = useSession();
	const [selectedEventUri, setSelectedEventUri] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [timeZone, setTimeZone] = useState<string | null>(null);
	useEffect(() => {
		setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);
	const timeZoneOffset = timeZone ? formatTimeZoneOffset(timeZone) : undefined;
	const connectionQuery = useCalendlyConnectionQuery();
	const eventsQuery = useCalendlyEventsQuery(
		connectionQuery.data?.connected === true,
	);
	const selectedEvent = eventsQuery.data?.find(
		(event) => event.uri === selectedEventUri,
	);

	if (connectionQuery.isPending) {
		return <p className="text-muted-foreground text-sm">Loading Calendly…</p>;
	}
	if (connectionQuery.isError) {
		const message =
			connectionQuery.error instanceof CalendlyConnectionError &&
			connectionQuery.error.status === 401
				? "Could not check your Calendly connection."
				: connectionQuery.error.message;
		return (
			<div className="flex flex-col items-center gap-3 text-center">
				<p role="alert" className="text-destructive text-sm">
					{message}
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void connectionQuery.refetch()}
				>
					Try again
				</Button>
			</div>
		);
	}
	if (!connectionQuery.data.connected) {
		return <CalendlyConnectButton isPro={session?.plan.tier === "pro"} />;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<Label id="calendly-events-label">Select your event</Label>
			<div className="min-h-0 flex-1">
				{eventsQuery.isPending ? (
					<ScrollArea
						aria-busy="true"
						aria-labelledby="calendly-events-label"
						className={calendlyEventsScrollAreaClassName}
					>
						<div aria-hidden="true" className="flex flex-col gap-2 pr-3">
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-14 w-full" />
							))}
						</div>
					</ScrollArea>
				) : eventsQuery.isError ? (
					<div className="flex flex-col items-center gap-3 text-center">
						<p role="alert" className="text-destructive text-sm">
							{eventsQuery.error.message}
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void eventsQuery.refetch()}
						>
							Try again
						</Button>
					</div>
				) : eventsQuery.data.length > 0 ? (
					<ScrollArea className={calendlyEventsScrollAreaClassName}>
						<ul
							aria-labelledby="calendly-events-label"
							className="grid list-none grid-cols-1 gap-2 md:grid-cols-2"
						>
							{eventsQuery.data.map((event) => {
								const isSelected = selectedEventUri === event.uri;
								return (
									<li key={event.uri}>
										<Item
											variant="outline"
											render={<button type="button" />}
											aria-pressed={isSelected}
											className={`smooth-shadow-xs h-auto min-h-14 w-full min-w-0 flex-nowrap justify-start whitespace-normal px-3 py-2 text-left hover:border-[var(--provider-brand-color)] hover:bg-[var(--provider-brand-color)]/10 ${isSelected ? "border-[var(--provider-brand-color)] bg-[var(--provider-brand-color)]/10" : ""}`}
											style={
												{
													"--provider-brand-color": calendlyBrandColor,
												} as CSSProperties
											}
											onClick={() => setSelectedEventUri(event.uri)}
										>
											<ItemContent className="min-w-0 gap-0.5">
												<ItemTitle className="max-w-full truncate">
													{event.name}
												</ItemTitle>
												<ItemDescription className="truncate whitespace-normal text-xs">
													{formatSessionDuration(event.duration)}
													{timeZone ? ` · ${timeZone}` : ""}
													{timeZoneOffset ? ` (${timeZoneOffset})` : ""}
												</ItemDescription>
											</ItemContent>
										</Item>
									</li>
								);
							})}
						</ul>
					</ScrollArea>
				) : (
					<p className="flex-1 py-3 text-center text-muted-foreground text-sm">
						No Calendly events found.
					</p>
				)}
			</div>
			<div className="flex shrink-0 justify-end">
				<Button
					type="button"
					variant="outline"
					size={"xl"}
					aria-busy={isAdding}
					aria-label={isAdding ? "Adding Calendly event" : undefined}
					disabled={!selectedEvent || isAdding}
					className="relative px-5 text-base"
					onClick={async () => {
						if (!selectedEvent) return;
						setIsAdding(true);
						try {
							await onAdd(selectedEvent);
						} catch {
							// The save flow already reports its error.
						} finally {
							setIsAdding(false);
						}
					}}
				>
					<span className={isAdding ? "opacity-0" : ""}>Add</span>
					{isAdding ? (
						<Loading aria-hidden="true" className="absolute size-4" />
					) : null}
				</Button>
			</div>
		</div>
	);
}
