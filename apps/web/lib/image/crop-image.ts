import type { ProfileImageCrop } from "@grabbin/api";

export type ProfileImageSourceSize = {
  width: number;
  height: number;
};

export function getCenteredProfileImageCrop(
  sourceSize: ProfileImageSourceSize,
): ProfileImageCrop {
  const aspect = sourceSize.width / sourceSize.height;
  if (aspect >= 1) {
    const width = (sourceSize.height / sourceSize.width) * 100;
    return { x: (100 - width) / 2, y: 0, width, height: 100 };
  }
  const height = (sourceSize.width / sourceSize.height) * 100;
  return { x: 0, y: (100 - height) / 2, width: 100, height };
}

export function isSquareProfileImageCrop(
  crop: ProfileImageCrop,
  sourceSize: ProfileImageSourceSize,
) {
  return (
    Math.abs(
      sourceSize.width * (crop.width / 100) -
        sourceSize.height * (crop.height / 100),
    ) <= 2
  );
}

export function getProfileImageCropImageStyle(crop: ProfileImageCrop) {
  return {
    position: "absolute" as const,
    maxWidth: "none",
    width: `${(100 / crop.width) * 100}%`,
    height: `${(100 / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };
}
