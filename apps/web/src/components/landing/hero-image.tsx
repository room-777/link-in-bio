"use client";

import { env } from "@grabbin/env/web";
import Image from "next/image";

const HERO_IMAGE_SOURCE = "/images/landing/hero-sky-4d2602c2c06a1997.png";
const HERO_IMAGE_WIDTHS = [480, 640, 768, 960, 1280, 1536];
const pageDomain = env.NEXT_PUBLIC_PAGE_DOMAIN?.replace(/\/$/, "");

const heroImageSrcSet =
	process.env.NODE_ENV === "production" &&
	pageDomain &&
	!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(pageDomain)
		? HERO_IMAGE_WIDTHS.map((width) => {
				const height = Math.round((width * 2) / 3);
				const options = `width=${width},height=${height},fit=cover,quality=70,format=auto`;
				const source = `https://${pageDomain}${HERO_IMAGE_SOURCE}`;
				return `https://${pageDomain}/cdn-cgi/image/${options}/${source} ${width}w`;
			}).join(", ")
		: undefined;

export default function HeroImage() {
	return (
		<picture className="absolute inset-0 z-0 block">
			{heroImageSrcSet ? (
				<source sizes="100vw" srcSet={heroImageSrcSet} />
			) : null}
			<Image
				alt=""
				aria-hidden="true"
				className="size-full object-cover object-center"
				fetchPriority="high"
				height={1707}
				loading="eager"
				quality={70}
				sizes="100vw"
				src={HERO_IMAGE_SOURCE}
				width={2560}
			/>
		</picture>
	);
}
