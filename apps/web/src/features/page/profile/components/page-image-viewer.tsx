"use client";

import { bentoWideMediaQuery } from "@grabbin/bento-layout";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { type RefObject, type SyntheticEvent, useState } from "react";

const MotionImage = motion.create(Image);

export default function PageImageViewer({
	src,
	fallbackSrc,
	isWide,
	className,
	imageRef,
	onLoad,
}: {
	src: string;
	fallbackSrc: string;
	isWide: boolean;
	className: string;
	imageRef: RefObject<HTMLImageElement | null>;
	onLoad: (image: HTMLImageElement) => void;
}) {
	const reduceMotion = useReducedMotion();
	const [loadedSrc, setLoadedSrc] = useState("");
	const [fallbackLoadedSrc, setFallbackLoadedSrc] = useState("");
	const isLoaded = loadedSrc === src;
	const isLocalPreview = src.startsWith("blob:") || src.startsWith("data:");
	const skipFade =
		(fallbackSrc && fallbackSrc !== src) || fallbackLoadedSrc === src;
	const sizes = isWide ? `${bentoWideMediaQuery} 184px, 112px` : "112px";
	const animation = {
		initial: reduceMotion ? false : { opacity: 0 },
		animate: { opacity: 1 },
		transition: reduceMotion
			? { duration: 0 }
			: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
	};
	const fallbackBackground =
		!isLocalPreview && fallbackSrc && fallbackSrc !== src && !isLoaded
			? {
					backgroundImage: `url("${fallbackSrc}")`,
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
				}
			: undefined;

	function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
		const image = event.currentTarget;
		if (isLocalPreview) {
			setLoadedSrc(src);
			onLoad(image);
			return;
		}
		void image
			.decode()
			.then(() => {
				setLoadedSrc(src);
				if (fallbackSrc && fallbackSrc !== src) setFallbackLoadedSrc(src);
				onLoad(image);
			})
			.catch(() => undefined);
	}

	return (
		<div className="absolute inset-0" style={fallbackBackground}>
			{isLocalPreview ? (
				<motion.img
					ref={imageRef}
					src={src}
					alt=""
					initial={animation.initial}
					animate={animation.animate}
					transition={animation.transition}
					className={className}
					onLoad={handleLoad}
				/>
			) : (
				<MotionImage
					ref={imageRef}
					fill
					src={src}
					alt=""
					sizes={sizes}
					initial={skipFade ? { opacity: 0 } : animation.initial}
					animate={skipFade ? { opacity: isLoaded ? 1 : 0 } : animation.animate}
					transition={skipFade ? { duration: 0 } : animation.transition}
					className={className}
					quality={65}
					loading="eager"
					onLoad={handleLoad}
				/>
			)}
		</div>
	);
}
