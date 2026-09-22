"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { Input } from "@grabbin/ui/components/input";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CircleArrowRightUp } from "reicon-react";

export function removeMapboxControls(map: { getContainer(): HTMLElement }) {
	map
		.getContainer()
		.querySelectorAll(
			".mapboxgl-ctrl, .mapboxgl-ctrl-icon, .mapboxgl-ctrl-logo",
		)
		.forEach((control) => {
			control.remove();
		});
}

export const textSizeClassByPreset: Record<PresetName, string> = {
	fullBanner: "text-lg font-medium leading-7",
	halfBanner: "text-lg font-medium leading-8.5",
	squareSmall: "text-lg font-medium leading-7",
	landscape: "text-lg font-medium leading-7",
	squareLarge: "text-lg font-medium leading-8",
	portrait: "text-lg font-medium leading-8",
};

const mediaCaptionClassName =
	"field-sizing-content h-7.5 w-fit max-w-full rounded-md border border-border bg-white/80 px-2 py-0 font-medium text-foreground text-sm backdrop-blur-sm";

export function ExternalAction({
	href,
	label,
}: {
	href: string;
	label: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			className="group inline-flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-full bg-white font-medium text-black text-xs shadow-md backdrop-blur-sm transition-colors hover:bg-white/60"
		>
			<CircleArrowRightUp
				aria-hidden="true"
				size={28}
				weight="Filled"
				className="text-black!"
			/>
		</a>
	);
}

export function MediaCaption({
	value,
	mode = "view",
	className,
	onChange,
}: {
	value: string | undefined;
	mode?: "view" | "edit";
	className?: string;
	onChange?: (value: string) => void;
}) {
	const caption = value?.trim();
	if (mode === "edit") {
		return (
			<Input
				data-bro-ignore="true"
				value={value ?? ""}
				placeholder="Caption"
				aria-label="Media caption"
				className={`pointer-events-auto min-w-24 truncate ${mediaCaptionClassName} ${className ?? ""}`}
				onChange={(event) => onChange?.(event.target.value)}
			/>
		);
	}
	return caption ? (
		<p
			className={`${mediaCaptionClassName} flex min-w-0 items-center ${className ?? ""}`}
		>
			<span className="block min-w-0 flex-1 truncate">{caption}</span>
		</p>
	) : null;
}

export function MapViewportGate({
	children,
	placeholder,
	forceMount = false,
}: {
	children: ReactNode;
	placeholder: ReactNode;
	forceMount?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		if (hasMounted) return;
		if (forceMount) {
			setHasMounted(true);
			return;
		}

		const container = containerRef.current;
		if (!container || typeof IntersectionObserver === "undefined") {
			setHasMounted(true);
			return;
		}

		let isNearViewport = false;
		let lastScrollAt = Number.NEGATIVE_INFINITY;
		let scrollIdleTimer: number | null = null;
		let idleTimer: number | null = null;
		let idleCallbackId: number | null = null;
		const scrollTarget = getScrollTarget(container);
		const idleWindow = window as Window & {
			requestIdleCallback?: (
				callback: () => void,
				options?: { timeout: number },
			) => number;
			cancelIdleCallback?: (handle: number) => void;
		};

		const clearIdleSchedule = () => {
			if (idleCallbackId !== null) {
				idleWindow.cancelIdleCallback?.(idleCallbackId);
				idleCallbackId = null;
			}
			if (idleTimer !== null) {
				window.clearTimeout(idleTimer);
				idleTimer = null;
			}
		};

		const mountWhenIdle = () => {
			if (!isNearViewport) return;
			clearIdleSchedule();

			const mount = () => {
				idleCallbackId = null;
				idleTimer = null;
				const remainingScrollTime =
					MAP_SCROLL_IDLE_DELAY - (Date.now() - lastScrollAt);
				if (remainingScrollTime > 0) {
					scrollIdleTimer = window.setTimeout(
						mountWhenIdle,
						remainingScrollTime,
					);
					return;
				}
				setHasMounted(true);
			};

			if (idleWindow.requestIdleCallback) {
				idleCallbackId = idleWindow.requestIdleCallback(mount, {
					timeout: MAP_IDLE_TIMEOUT,
				});
			} else {
				idleTimer = window.setTimeout(mount, 50);
			}
		};

		const scheduleAfterScroll = () => {
			if (!isNearViewport) return;
			if (scrollIdleTimer !== null) {
				window.clearTimeout(scrollIdleTimer);
			}
			scrollIdleTimer = window.setTimeout(mountWhenIdle, MAP_SCROLL_IDLE_DELAY);
		};

		const handleScroll = () => {
			lastScrollAt = Date.now();
			clearIdleSchedule();
			scheduleAfterScroll();
		};

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				isNearViewport = true;
				mountWhenIdle();
			},
			{
				root: scrollTarget instanceof HTMLElement ? scrollTarget : null,
				rootMargin: "200px 0px",
			},
		);
		scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
		observer.observe(container);
		return () => {
			observer.disconnect();
			scrollTarget.removeEventListener("scroll", handleScroll);
			if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
			clearIdleSchedule();
		};
	}, [forceMount, hasMounted]);

	return (
		<div ref={containerRef} className="relative size-full min-h-0">
			{hasMounted || forceMount ? children : placeholder}
		</div>
	);
}

const MAP_SCROLL_IDLE_DELAY = 160;
const MAP_IDLE_TIMEOUT = 1000;

function getScrollTarget(element: HTMLElement): HTMLElement | Window {
	let current = element.parentElement;
	while (current) {
		const { overflowY } = window.getComputedStyle(current);
		if (
			/(auto|scroll|overlay)/.test(overflowY) &&
			current.scrollHeight > current.clientHeight
		) {
			return current;
		}
		current = current.parentElement;
	}
	return window;
}
