"use client";

import type { CalendlyAvailabilityTime, CalendlyEventType } from "@grabbin/api";
import { getBentoItemRadius, type PresetName } from "@grabbin/bento-layout";
import { providerIconUrl } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import { ScrollArea } from "@grabbin/ui/components/scroll-area";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendlyPreset = Exclude<PresetName, "fullBanner">;
export type AvailabilityView = "slots" | "calendar";
export type CalendlyAvailability = {
	loading: boolean;
	error: boolean;
	errorMessage?: string;
	times: CalendlyAvailabilityTime[];
	displayTimeZone?: string;
	bookingUrl: string;
	selectedDate: Date;
	timespanStart: Date;
	timespanEnd: Date;
	canGoToPreviousDay: boolean;
	canGoToNextDay: boolean;
	canGoToPreviousMonth: boolean;
	canGoToNextMonth: boolean;
	onChangeDay: (offset: number) => void;
	onChangeMonth: (offset: number) => void;
};
export type CalendlyPresetWidgetProps = {
	event: CalendlyEventType;
	timeZone: { name: string; label: string } | null;
	availability: CalendlyAvailability;
	availabilityView: AvailabilityView;
};
const selectedDateFormatter = new Intl.DateTimeFormat("en-US", {
	weekday: "short",
	month: "short",
	day: "numeric",
});
const slotTimeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
});
const monthFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	year: "numeric",
});

function localDateKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addLocalDays(date: Date, days: number) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return nextDate;
}

function formatSessionDuration(minutes: number | null) {
	if (!minutes || minutes < 1) return "Duration unavailable";
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function CalendlyMonthCalendar({
	availability,
}: {
	availability: CalendlyAvailability;
}) {
	const monthStart = new Date(
		availability.selectedDate.getFullYear(),
		availability.selectedDate.getMonth(),
		1,
	);
	const firstFullWeek = addLocalDays(
		monthStart,
		monthStart.getDay() === 0 ? 0 : 7 - monthStart.getDay(),
	);
	const firstAvailableDate = availability.times
		.map((time) => new Date(time.startTime))
		.filter(
			(date) =>
				Number.isFinite(date.getTime()) &&
				date.getFullYear() === monthStart.getFullYear() &&
				date.getMonth() === monthStart.getMonth(),
		)
		.sort((a, b) => a.getTime() - b.getTime())[0];
	const firstAvailableWeek = firstAvailableDate
		? addLocalDays(firstAvailableDate, -firstAvailableDate.getDay())
		: firstFullWeek;
	const firstVisibleDate =
		firstAvailableWeek > firstFullWeek ? firstAvailableWeek : firstFullWeek;
	const cellCount =
		Math.ceil(
			(new Date(
				monthStart.getFullYear(),
				monthStart.getMonth() + 1,
				0,
			).getDate() -
				firstVisibleDate.getDate() +
				1) /
				7,
		) * 7;
	const dates = Array.from({ length: cellCount }, (_, index) =>
		addLocalDays(firstVisibleDate, index),
	);
	const availableDateKeys = new Set(
		availability.times.flatMap((time) => {
			const date = new Date(time.startTime);
			if (!Number.isFinite(date.getTime())) return [];
			date.setHours(0, 0, 0, 0);
			return [localDateKey(date)];
		}),
	);
	return (
		<div
			data-bento-item-drag-cancel="true"
			className="flex min-h-0 w-full flex-1 cursor-auto! flex-col gap-2"
		>
			<div className="flex shrink-0 items-center justify-between gap-2">
				<button
					type="button"
					aria-label="Previous month"
					disabled={!availability.canGoToPreviousMonth}
					onClick={() => availability.onChangeMonth(-1)}
					className="flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-md text-primary hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-40"
				>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</button>
				<p className="min-w-0 truncate text-center font-medium text-neutral-900 text-xs">
					{monthFormatter.format(monthStart)}
				</p>
				<button
					type="button"
					aria-label="Next month"
					disabled={!availability.canGoToNextMonth}
					onClick={() => availability.onChangeMonth(1)}
					className="flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-md text-primary hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-40"
				>
					<ChevronRight aria-hidden="true" className="size-4" />
				</button>
			</div>
			<div aria-busy={availability.loading} className="grid grid-cols-7 gap-1">
				{dates.map((date, index) => {
					if (date.getMonth() !== monthStart.getMonth()) {
						return (
							<span
								key={`empty-${index}`}
								aria-hidden="true"
								className="aspect-square"
							/>
						);
					}
					if (availability.loading) {
						return (
							<div
								key={localDateKey(date)}
								className="flex aspect-square items-center justify-center"
							>
								<Skeleton
									aria-hidden="true"
									className="size-[34px] rounded-full"
								/>
							</div>
						);
					}

					const dateKey = localDateKey(date);
					const isAvailable = availableDateKeys.has(dateKey);
					const dateParam = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
					const dateBookingUrl = new URL(availability.bookingUrl);
					dateBookingUrl.searchParams.set("month", dateParam.slice(0, 7));
					dateBookingUrl.searchParams.set("date", dateParam);
					const dayContent = (
						<span
							className={`flex size-[34px] items-center justify-center rounded-full ${isAvailable ? "bg-[#006bff] text-white hover:bg-[#0059d6]" : "text-muted-foreground/50"}`}
						>
							{date.getDate()}
						</span>
					);
					return isAvailable ? (
						<a
							key={dateKey}
							href={dateBookingUrl.toString()}
							target="_blank"
							rel="noreferrer"
							aria-label={`${selectedDateFormatter.format(date)}, book on Calendly`}
							className="flex aspect-square cursor-pointer! items-center justify-center rounded-full font-medium text-xs focus-visible:outline-2 focus-visible:outline-[#006bff] focus-visible:outline-offset-2"
						>
							{dayContent}
						</a>
					) : (
						<time
							key={dateKey}
							dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
							className="flex aspect-square items-center justify-center rounded-full font-semibold text-xs"
						>
							{dayContent}
						</time>
					);
				})}
			</div>
			{!availability.loading && availableDateKeys.size === 0 ? (
				<p className="text-center text-muted-foreground text-xs">
					No available times.
				</p>
			) : null}
		</div>
	);
}

function CalendlyAvailabilityPicker({
	availability,
	preset,
	view,
}: {
	availability: CalendlyAvailability;
	preset: CalendlyPreset;
	view: AvailabilityView;
}) {
	if (view === "calendar") {
		return <CalendlyMonthCalendar availability={availability} />;
	}
	const timeFormatter = availability.displayTimeZone
		? new Intl.DateTimeFormat("en-US", {
				hour: "numeric",
				minute: "2-digit",
				timeZone: availability.displayTimeZone,
			})
		: slotTimeFormatter;

	const selectedDateKey = localDateKey(availability.selectedDate);
	const slots = availability.times.filter((time) => {
		const startTime = new Date(time.startTime);
		return (
			Number.isFinite(startTime.getTime()) &&
			localDateKey(startTime) === selectedDateKey
		);
	});

	return (
		<div
			data-bento-item-drag-cancel="true"
			className="flex h-full min-h-0 w-full flex-1 cursor-auto! flex-col gap-2"
		>
			<div className="flex shrink-0 items-center justify-between gap-2">
				<button
					type="button"
					aria-label="Previous day"
					disabled={!availability.canGoToPreviousDay}
					onClick={() => availability.onChangeDay(-1)}
					className="flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-md text-primary hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-40"
				>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</button>
				<p className="min-w-0 truncate text-center font-medium text-neutral-900 text-xs">
					{selectedDateFormatter.format(availability.selectedDate)}
				</p>
				<button
					type="button"
					aria-label="Next day"
					disabled={!availability.canGoToNextDay}
					onClick={() => availability.onChangeDay(1)}
					className="flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-md text-primary hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-40"
				>
					<ChevronRight aria-hidden="true" className="size-4" />
				</button>
			</div>
			<ScrollArea
				aria-busy={availability.loading}
				className="[&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scrollbar-none min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar]]:hidden"
			>
				{availability.loading ? (
					<div
						aria-hidden="true"
						className={`grid gap-1.5 ${preset === "portrait" ? "grid-cols-1" : "grid-cols-2"}`}
					>
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton key={index} className="h-8 w-full rounded-md" />
						))}
					</div>
				) : slots.length ? (
					<div
						className={`grid gap-1.5 ${preset === "portrait" ? "grid-cols-1" : "grid-cols-2"}`}
					>
						{slots.map((slot) => (
							<a
								key={`${slot.startTime}:${slot.schedulingUrl}`}
								href={slot.schedulingUrl}
								target="_blank"
								rel="noreferrer"
								className="smooth-shadow-xs flex h-8 min-w-0 cursor-pointer! items-center justify-center rounded-md border border-border/80 px-1.5 py-1.5 text-center font-medium text-neutral-800 text-xs hover:border-[#006bff] hover:bg-[#006bff]/5 focus-visible:border-[#006bff] focus-visible:bg-[#006bff]/5 focus-visible:outline-2 focus-visible:outline-[#006bff] focus-visible:outline-offset-2"
							>
								{timeFormatter.format(new Date(slot.startTime))}
							</a>
						))}
					</div>
				) : (
					<p className="text-center text-muted-foreground text-xs">
						No available times.
					</p>
				)}
			</ScrollArea>
		</div>
	);
}

function CalendlyEventInfo({
	event,
	timeZone,
	loading,
	className = "flex-1",
}: {
	event: CalendlyEventType;
	timeZone: CalendlyPresetWidgetProps["timeZone"];
	loading: boolean;
	className?: string;
}) {
	return (
		<div className={`flex min-w-0 flex-row items-stretch gap-2 ${className}`}>
			<div className="smooth-shadow-xs flex size-9.5 shrink-0 items-center justify-center rounded-lg border border-border bg-white">
				<img
					src={providerIconUrl("calendly")}
					alt=""
					aria-hidden="true"
					className="size-6 object-contain"
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{loading ? (
					<Skeleton aria-hidden="true" className="h-4 w-3/4 rounded-sm" />
				) : (
					<h3 className="truncate font-medium text-neutral-900 text-sm">
						{event.name}
					</h3>
				)}
				{loading ? (
					<Skeleton aria-hidden="true" className="h-3 w-1/2 rounded-sm" />
				) : (
					<div className="flex min-w-0 items-center gap-0.5 text-neutral-500 text-xs">
						<p className="shrink-0 whitespace-nowrap">
							{formatSessionDuration(event.duration)}
						</p>
						{timeZone ? (
							<>
								<span aria-hidden="true">·</span>
								<span className="truncate" title={timeZone.name}>
									{timeZone.label}
								</span>
							</>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}

function CalendlyBookButton({
	event,
	compact = false,
}: {
	event: CalendlyEventType;
	compact?: boolean;
}) {
	return (
		<Button
			render={
				<a
					className="cursor-pointer!"
					href={event.schedulingUrl}
					target="_blank"
					rel="noreferrer"
				/>
			}
			variant="outline"
			size={compact ? "sm" : "xl"}
			className={`rounded-md font-medium ${compact ? "h-8" : "h-10 w-full"}`}
		>
			Book a time
		</Button>
	);
}

function CalendlyAvailabilityError({
	message,
	className = "",
}: {
	message?: string;
	className?: string;
}) {
	return (
		<p
			role="alert"
			className={`text-center font-medium text-muted-foreground/50 text-sm ${className}`}
		>
			<span className="block">{message ?? "Could not load availability."}</span>
			<span className="block">Book directly on Calendly.</span>
		</p>
	);
}

function CalendlySquareSmall(props: CalendlyPresetWidgetProps) {
	const { event, timeZone, availability } = props;
	return (
		<article
			data-bento-preset="squareSmall"
			style={{ borderRadius: getBentoItemRadius("link", "squareSmall") }}
			className="flex size-full min-h-0 flex-col items-stretch justify-between gap-3 overflow-hidden bg-white p-5"
		>
			<div className="flex min-w-0 flex-row items-start gap-2">
				<CalendlyEventInfo
					event={event}
					timeZone={timeZone}
					loading={availability.loading}
				/>
			</div>
			<CalendlyBookButton event={event} />
		</article>
	);
}

function CalendlyHalfBanner(props: CalendlyPresetWidgetProps) {
	const { event, timeZone, availability } = props;
	return (
		<article
			data-bento-preset="halfBanner"
			style={{ borderRadius: getBentoItemRadius("link", "halfBanner") }}
			className="flex size-full min-h-0 flex-row items-center justify-between gap-3 overflow-hidden bg-white p-5"
		>
			<div className="flex min-w-0 flex-1 flex-row items-start gap-2">
				<CalendlyEventInfo
					event={event}
					timeZone={timeZone}
					loading={availability.loading}
				/>
			</div>
			<CalendlyBookButton event={event} compact />
		</article>
	);
}

function CalendlyLandscape(props: CalendlyPresetWidgetProps) {
	const { event, timeZone, availability, availabilityView } = props;
	return (
		<article
			data-bento-preset="landscape"
			style={{ borderRadius: getBentoItemRadius("link", "landscape") }}
			className="flex size-full min-h-0 flex-row items-stretch justify-between gap-3 overflow-hidden bg-white p-5"
		>
			<div className="flex min-w-0 flex-1 basis-0 flex-col justify-between gap-2">
				<CalendlyEventInfo
					event={event}
					timeZone={timeZone}
					loading={availability.loading}
					className=""
				/>
				<CalendlyBookButton event={event} />
			</div>
			<div className="flex min-w-0 flex-1 basis-0 items-center justify-center">
				{availability.error ? (
					<CalendlyAvailabilityError message={availability.errorMessage} />
				) : (
					<CalendlyAvailabilityPicker
						availability={availability}
						preset="landscape"
						view={availabilityView}
					/>
				)}
			</div>
		</article>
	);
}

function CalendlyPortrait(props: CalendlyPresetWidgetProps) {
	const { event, timeZone, availability, availabilityView } = props;
	return (
		<article
			data-bento-preset="portrait"
			style={{ borderRadius: getBentoItemRadius("link", "portrait") }}
			className="flex size-full min-h-0 flex-col items-stretch justify-between gap-3 overflow-hidden bg-white p-5"
		>
			<div className="flex min-w-0 flex-row items-start gap-2">
				<CalendlyEventInfo
					event={event}
					timeZone={timeZone}
					loading={availability.loading}
				/>
			</div>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2">
				{availability.error ? (
					<CalendlyAvailabilityError
						message={availability.errorMessage}
						className="flex min-h-0 flex-1 flex-col items-center justify-center"
					/>
				) : (
					<CalendlyAvailabilityPicker
						availability={availability}
						preset="portrait"
						view={availabilityView}
					/>
				)}
				<CalendlyBookButton event={event} />
			</div>
		</article>
	);
}

function CalendlySquareLarge(props: CalendlyPresetWidgetProps) {
	const { event, timeZone, availability, availabilityView } = props;
	return (
		<article
			data-bento-preset="squareLarge"
			style={{ borderRadius: getBentoItemRadius("link", "squareLarge") }}
			className="flex size-full min-h-0 flex-col items-stretch justify-between gap-3 overflow-hidden bg-white p-5"
		>
			<div className="flex w-full min-w-0 flex-row items-start gap-2">
				<CalendlyEventInfo
					event={event}
					timeZone={timeZone}
					loading={availability.loading}
				/>
			</div>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-between">
				{availability.error ? (
					<CalendlyAvailabilityError message={availability.errorMessage} />
				) : (
					<CalendlyAvailabilityPicker
						availability={availability}
						preset="squareLarge"
						view={availabilityView}
					/>
				)}
				<CalendlyBookButton event={event} />
			</div>
		</article>
	);
}

export default function CalendlyWidget({
	preset,
	...props
}: CalendlyPresetWidgetProps & { preset: CalendlyPreset }) {
	const Component = {
		squareSmall: CalendlySquareSmall,
		halfBanner: CalendlyHalfBanner,
		landscape: CalendlyLandscape,
		portrait: CalendlyPortrait,
		squareLarge: CalendlySquareLarge,
	}[preset];
	return <Component {...props} />;
}

export { CalendlyWidget };
