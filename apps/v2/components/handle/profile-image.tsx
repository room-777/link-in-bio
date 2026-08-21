"use client";

import type { ProfileImageCrop } from "@grabbin/api";
import Image from "next/image";
import {
  type Breakpoint,
  getPageLayoutClasses,
} from "@/lib/handle/page-layout";
import { getProfileImageCropImageStyle } from "@/lib/image/crop-image";

export function ProfileImage({
  imageUrl,
  title,
  crop,
  breakpoint,
}: {
  imageUrl: string | null;
  title: string;
  crop?: ProfileImageCrop | null;
  breakpoint: Breakpoint;
}) {
  const frameClassName = `relative flex size-28 items-center justify-center overflow-hidden rounded-full ${getPageLayoutClasses(breakpoint).image}`;

  if (!imageUrl) return <div className={frameClassName} />;

  return (
    <div className={frameClassName}>
      {crop ? (
        <div
          className="pointer-events-none rounded-lg"
          style={getProfileImageCropImageStyle(crop)}
        >
          <Image
            src={imageUrl}
            alt={title}
            width={150}
            height={150}
            className="size-full rounded-lg object-cover"
            loading="eager"
          />
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={title}
          width={150}
          height={150}
          className="size-full rounded-lg object-cover"
          loading="eager"
        />
      )}
    </div>
  );
}
