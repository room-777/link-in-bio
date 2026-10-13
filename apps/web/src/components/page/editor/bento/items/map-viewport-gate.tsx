"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { getScrollTarget } from "./shared";

const MAP_SCROLL_IDLE_DELAY = 160;
const MAP_IDLE_TIMEOUT = 1000;

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
