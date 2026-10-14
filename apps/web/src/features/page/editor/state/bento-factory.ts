import {
	type CalendlyEventType,
	createInitialLinkMetadata,
	type ItemType,
} from "@grabbin/api";
import {
	type BentoBreakpoint,
	getColumns,
	getDefaultPreset,
	getPresetGeometry,
	placeAtFirstAvailable,
} from "@grabbin/bento-layout";
import type { BentoItem } from "./bento-types";

const breakpoints: BentoBreakpoint[] = ["wide", "compact"];

function createBentoItemId() {
	const cryptoApi = globalThis.crypto;
	if (typeof cryptoApi?.randomUUID === "function") {
		return cryptoApi.randomUUID();
	}

	const bytes = new Uint8Array(16);
	if (typeof cryptoApi?.getRandomValues === "function") {
		cryptoApi.getRandomValues(bytes);
	} else {
		for (let index = 0; index < bytes.length; index += 1) {
			bytes[index] = Math.floor(Math.random() * 256);
		}
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return [...bytes]
		.map((byte, index) => {
			const value = byte.toString(16).padStart(2, "0");
			return [4, 6, 8, 10].includes(index) ? `-${value}` : value;
		})
		.join("");
}

function toLayoutMap(items: readonly BentoItem[], breakpoint: BentoBreakpoint) {
	return Object.fromEntries(
		items.map((item) => [item.id, item.layouts[breakpoint]]),
	);
}

export function createBentoItem({
	items,
	itemType,
	url,
	media,
	calendlyEvent,
}: {
	items: readonly BentoItem[];
	itemType: ItemType;
	url?: string;
	media?: { mimeType: string; previewUrl: string };
	calendlyEvent?: CalendlyEventType;
}): BentoItem {
	const id = createBentoItemId();
	const preset = getDefaultPreset(itemType);
	const layouts = Object.fromEntries(
		breakpoints.map((breakpoint) => [
			breakpoint,
			placeAtFirstAvailable(
				toLayoutMap(items, breakpoint),
				getPresetGeometry(preset, breakpoint),
				getColumns(breakpoint),
			),
		]),
	) as BentoItem["layouts"];
	const now = new Date().toISOString();
	const base = {
		id,
		style: {},
		layouts,
		createdAt: now,
		updatedAt: now,
		preset,
	};

	switch (itemType) {
		case "text":
			return { ...base, type: itemType, data: { text: "" } };
		case "section":
			return { ...base, type: itemType, data: { title: "" } };
		case "map":
			return {
				...base,
				type: itemType,
				data: { latitude: 37.5665, longitude: 126.978, zoom: 12 },
			};
		case "link": {
			const linkUrl = url?.trim() || "https://example.com";
			return {
				...base,
				type: itemType,
				data: {
					url: linkUrl,
					metadata: createInitialLinkMetadata(linkUrl),
				},
			};
		}
		case "calendly": {
			if (!calendlyEvent) throw new Error("Calendly event required.");
			return {
				...base,
				type: itemType,
				data: {
					eventTypeUri: calendlyEvent.uri,
					schedulingUrl: calendlyEvent.schedulingUrl,
				},
			};
		}
		case "media":
			return {
				...base,
				type: itemType,
				data: {
					objectKey: "pending",
					mimeType: media?.mimeType ?? "image/jpeg",
					...(media?.previewUrl ? { mediaUrl: media.previewUrl } : {}),
				},
			};
	}
}
