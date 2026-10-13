"use client";

import type { PresetName } from "@grabbin/bento-layout";

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
	fullBanner: "text-xl font-normal leading-8",
	halfBanner: "text-xl font-normal leading-10",
	squareSmall: "text-xl font-normal leading-[35.5px]",
	landscape: "text-xl font-normal leading-[35.5px]",
	squareLarge: "text-xl font-normal leading-9",
	portrait: "text-xl font-normal leading-9",
};

export function getScrollTarget(element: HTMLElement): HTMLElement | Window {
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
