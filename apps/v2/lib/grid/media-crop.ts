import type { NormalizedCrop } from "@grabbin/api";

export type MediaSourceSize = {
  width: number;
  height: number;
};

export type MediaFrameSize = MediaSourceSize;

function hasSize(size: MediaSourceSize) {
  return size.width > 0 && size.height > 0;
}

export function getCenteredMediaCrop(
  sourceSize: MediaSourceSize,
  frameSize: MediaFrameSize,
): NormalizedCrop {
  if (!hasSize(sourceSize) || !hasSize(frameSize)) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  const sourceAspect = sourceSize.width / sourceSize.height;
  const frameAspect = frameSize.width / frameSize.height;
  if (sourceAspect >= frameAspect) {
    const width = (frameAspect / sourceAspect) * 100;
    return {
      x: (100 - width) / 2,
      y: 0,
      width,
      height: 100,
    };
  }

  const height = (sourceAspect / frameAspect) * 100;
  return {
    x: 0,
    y: (100 - height) / 2,
    width: 100,
    height,
  };
}

export function isMediaCropAspectCompatible(
  crop: NormalizedCrop,
  sourceSize: MediaSourceSize,
  frameSize: MediaFrameSize,
) {
  if (!hasSize(sourceSize) || !hasSize(frameSize)) return false;

  const cropAspect =
    (sourceSize.width * crop.width) / (sourceSize.height * crop.height);
  const frameAspect = frameSize.width / frameSize.height;
  return Math.abs(cropAspect - frameAspect) <= 0.01;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function moveMediaCrop(
  crop: NormalizedCrop,
  deltaX: number,
  deltaY: number,
  frameSize: MediaFrameSize,
): NormalizedCrop {
  if (!hasSize(frameSize)) return crop;

  return {
    ...crop,
    x: clamp(
      crop.x - (deltaX / frameSize.width) * crop.width,
      0,
      100 - crop.width,
    ),
    y: clamp(
      crop.y - (deltaY / frameSize.height) * crop.height,
      0,
      100 - crop.height,
    ),
  };
}

export function getMediaCropStyle(
  crop: NormalizedCrop,
): Record<string, string> {
  return {
    position: "absolute",
    maxWidth: "none",
    width: `${(100 / crop.width) * 100}%`,
    height: `${(100 / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };
}
