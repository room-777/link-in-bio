"use client";

import type { PresetName } from "@grabbin/bento-layout";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CircleArrowRightUp } from "reicon-react";

export const mapboxLib = import("mapbox-gl").then((module) => {
	if (typeof window !== "undefined") module.default.prewarm();
	return module;
});

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
			className="group inline-flex size-7 shrink-0 cursor-pointer! items-center justify-center rounded-full bg-white/60 font-medium text-white text-xs transition-colors hover:bg-white"
		>
			<CircleArrowRightUp
				aria-hidden="true"
				size={28}
				weight="Filled"
				className="text-black/60! group-hover:text-black!"
			/>
		</a>
	);
}

export function MediaCaption({ value }: { value: string | undefined }) {
	const caption = value?.trim();
	return caption ? (
		<p className="field-sizing-content flex h-7.5 w-fit min-w-0 max-w-full items-center rounded-md border border-border bg-white/80 px-2 py-0 font-medium text-foreground text-sm backdrop-blur-sm">
			<span className="block min-w-0 flex-1 truncate">{caption}</span>
		</p>
	) : null;
}

export function MapViewportGate({
	children,
	placeholder,
}: {
	children: ReactNode;
	placeholder: ReactNode;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		if (hasMounted) return;
		const container = containerRef.current;
		if (!container || typeof IntersectionObserver === "undefined") {
			setHasMounted(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) setHasMounted(true);
			},
			{ rootMargin: "200px 0px" },
		);
		observer.observe(container);
		return () => observer.disconnect();
	}, [hasMounted]);

	return (
		<div ref={containerRef} className="relative size-full min-h-0">
			{hasMounted ? children : placeholder}
		</div>
	);
}
