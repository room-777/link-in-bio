import type { NormalizedCrop } from "@grabbin/api";

type MediaSize = { width: number; height: number };

function hasSize(size: MediaSize) {
	return size.width > 0 && size.height > 0;
}

export function getCenteredMediaCrop(
	source: MediaSize,
	frame: MediaSize,
): NormalizedCrop {
	if (!hasSize(source) || !hasSize(frame)) {
		return { x: 0, y: 0, width: 100, height: 100 };
	}
	const sourceAspect = source.width / source.height;
	const frameAspect = frame.width / frame.height;
	if (sourceAspect >= frameAspect) {
		const width = (frameAspect / sourceAspect) * 100;
		return { x: (100 - width) / 2, y: 0, width, height: 100 };
	}
	const height = (sourceAspect / frameAspect) * 100;
	return { x: 0, y: (100 - height) / 2, width: 100, height };
}

export function isCropCompatible(
	crop: NormalizedCrop,
	source: MediaSize,
	frame: MediaSize,
) {
	if (!hasSize(source) || !hasSize(frame)) return false;
	const cropAspect =
		(source.width * crop.width) / (source.height * crop.height);
	return Math.abs(cropAspect - frame.width / frame.height) <= 0.01;
}

export function moveMediaCrop(
	crop: NormalizedCrop,
	deltaX: number,
	deltaY: number,
	frame: MediaSize,
): NormalizedCrop {
	if (!hasSize(frame)) return crop;
	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value));
	return {
		...crop,
		x: clamp(crop.x - (deltaX / frame.width) * crop.width, 0, 100 - crop.width),
		y: clamp(
			crop.y - (deltaY / frame.height) * crop.height,
			0,
			100 - crop.height,
		),
	};
}

export function getMediaCropStyle(crop: NormalizedCrop) {
	return {
		position: "absolute" as const,
		maxWidth: "none",
		width: `${(100 / crop.width) * 100}%`,
		height: `${(100 / crop.height) * 100}%`,
		left: `${(-crop.x / crop.width) * 100}%`,
		top: `${(-crop.y / crop.height) * 100}%`,
	};
}
