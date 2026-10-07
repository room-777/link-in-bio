"use client";

import { type PageImageCrop, pageImageContentTypes } from "@grabbin/api";
import {
	type BentoBreakpoint,
	bentoWideMediaQuery,
} from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { CircleFadingArrowUp, Crop } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import {
	type RefObject,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Trash2 } from "reicon-react/icons/Trash2";
import {
	getCenteredMediaCrop,
	getMediaCropStyle,
	isCropCompatible,
	moveMediaCrop,
} from "@/lib/bento/media-crop";

const MotionImage = motion.create(Image);

const maxImageSize = 5 * 1024 * 1024;

function PageProfileImage({
	src,
	sizes,
	className,
	reduceMotion,
	imageRef,
	onLoad,
}: {
	src: string;
	sizes: string;
	className: string;
	reduceMotion: boolean | null;
	imageRef: RefObject<HTMLImageElement | null>;
	onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
	const animation = {
		initial: reduceMotion ? false : { opacity: 0 },
		animate: { opacity: 1 },
		transition: reduceMotion
			? { duration: 0 }
			: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
	};
	const isLocalPreview = src.startsWith("blob:") || src.startsWith("data:");

	return isLocalPreview ? (
		<motion.img
			ref={imageRef}
			src={src}
			alt=""
			initial={animation.initial}
			animate={animation.animate}
			transition={animation.transition}
			className={className}
			onLoad={onLoad}
		/>
	) : (
		<MotionImage
			ref={imageRef}
			fill
			src={src}
			alt=""
			sizes={sizes}
			initial={animation.initial}
			animate={animation.animate}
			transition={animation.transition}
			className={className}
			quality={65}
			loading="lazy"
			onLoad={onLoad}
		/>
	);
}

export default function PageImageField({
	value,
	crop,
	onCropChange,
	onSelect,
	onRemove,
	onError,
	isUploading = false,
	breakpoint = "wide",
}: {
	value: string;
	crop?: PageImageCrop | null;
	onCropChange?: (crop: PageImageCrop | null) => void;
	onSelect: (file: File) => void;
	onRemove: () => void;
	onError: (message: string) => void;
	isUploading?: boolean;
	breakpoint?: BentoBreakpoint;
}) {
	const isWide = breakpoint === "wide";
	const inputRef = useRef<HTMLInputElement>(null);
	const frameRef = useRef<HTMLButtonElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const reduceMotion = useReducedMotion();
	const [cropOpen, setCropOpen] = useState(false);
	const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
	const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
	const [draftCrop, setDraftCrop] = useState<PageImageCrop>();
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startCrop: PageImageCrop;
	} | null>(null);

	useEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		const update = () => {
			const rect = frame.getBoundingClientRect();
			setFrameSize({ width: rect.width, height: rect.height });
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);

	const handleImageLoad = useCallback(
		(event: SyntheticEvent<HTMLImageElement>) => {
			const image = event.currentTarget;
			setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
		},
		[],
	);
	useEffect(() => {
		const image = imageRef.current;
		if (!image?.complete || !image.naturalWidth) return;
		setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
	}, [value]);
	const centeredCrop =
		sourceSize.width > 0 && frameSize.width > 0
			? getCenteredMediaCrop(sourceSize, frameSize)
			: undefined;
	const profileImageControlSize = Math.max(
		32,
		Math.min(
			40,
			Math.round(Math.min(frameSize.width, frameSize.height) * 0.25),
		),
	);
	const profileImageControlIconSize = Math.max(
		18,
		Math.round(profileImageControlSize / 2),
	);
	const renderedCrop = cropOpen
		? (draftCrop ?? centeredCrop)
		: crop && isCropCompatible(crop, sourceSize, frameSize)
			? crop
			: centeredCrop;
	const cropStyle = renderedCrop ? getMediaCropStyle(renderedCrop) : undefined;

	function openCrop() {
		setDraftCrop(renderedCrop);
		setCropOpen(true);
	}

	function closeCrop() {
		if (draftCrop) onCropChange?.(draftCrop);
		dragRef.current = null;
		setDraftCrop(undefined);
		setCropOpen(false);
	}

	function handleCropPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
		if (
			!cropOpen ||
			!draftCrop ||
			(event.pointerType === "mouse" && event.button !== 0)
		)
			return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startCrop: draftCrop,
		};
	}

	function handleCropPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
		const drag = dragRef.current;
		if (!drag || !draftCrop || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		setDraftCrop(
			moveMediaCrop(
				drag.startCrop,
				event.clientX - drag.startX,
				event.clientY - drag.startY,
				frameSize,
			),
		);
	}

	function handleCropPointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
		if (!dragRef.current || dragRef.current.pointerId !== event.pointerId)
			return;
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (
			!pageImageContentTypes.includes(
				file.type as (typeof pageImageContentTypes)[number],
			) ||
			file.size > maxImageSize
		) {
			onError("Choose an image smaller than 5 MB.");
			return;
		}
		onSelect(file);
		setCropOpen(false);
		setDraftCrop(undefined);
	}

	return (
		<div
			data-page-image-crop-open={cropOpen ? "true" : undefined}
			className={`group/image relative isolate self-start ${isWide ? "page-wide:size-46! size-28!" : "size-28!"}`}
		>
			<button
				ref={frameRef}
				type="button"
				aria-label="Change profile image"
				aria-busy={isUploading}
				disabled={isUploading}
				className={`relative flex size-full items-center justify-center rounded-full bg-brand-light-gray font-medium text-muted-foreground text-sm transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${cropOpen ? "cursor-grab touch-none overflow-visible" : "overflow-visible hover:bg-muted active:scale-[0.97]"}`}
				onClick={() => {
					if (!cropOpen) inputRef.current?.click();
				}}
				onPointerDown={handleCropPointerDown}
				onPointerMove={handleCropPointerMove}
				onPointerUp={handleCropPointerEnd}
				onPointerCancel={handleCropPointerEnd}
			>
				<span
					className={`absolute inset-0 flex size-full items-center justify-center rounded-full ${cropOpen ? "overflow-visible" : "overflow-hidden"}`}
				>
					{value ? (
						cropStyle ? (
							<div
								className={`absolute overflow-hidden ${cropOpen ? "smooth-shadow-lg rounded-md" : "rounded-full"}`}
								style={cropStyle}
							>
								<PageProfileImage
									src={value}
									sizes={
										isWide ? `${bentoWideMediaQuery} 184px, 112px` : "112px"
									}
									reduceMotion={reduceMotion}
									imageRef={imageRef}
									onLoad={handleImageLoad}
									className={`size-full ${cropOpen ? "rounded-md" : "rounded-full object-cover"}`}
								/>
								{cropOpen && renderedCrop ? (
									<div
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-md"
									>
										<span
											className="pointer-events-none absolute rounded-full"
											style={{
												left: `${renderedCrop.x}%`,
												top: `${renderedCrop.y}%`,
												width: `${renderedCrop.width}%`,
												height: `${renderedCrop.height}%`,
												boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
											}}
										/>
									</div>
								) : null}
							</div>
						) : (
							<PageProfileImage
								src={value}
								sizes={isWide ? `${bentoWideMediaQuery} 184px, 112px` : "112px"}
								reduceMotion={reduceMotion}
								imageRef={imageRef}
								onLoad={handleImageLoad}
								className={`size-full object-cover ${cropOpen ? "rounded-md" : "rounded-full"}`}
							/>
						)
					) : (
						<CircleFadingArrowUp
							className={`size-6 ${isWide ? "page-wide:size-9" : ""}`}
							strokeWidth={2.5}
							aria-hidden="true"
						/>
					)}
					{value && (
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-10 rounded-full outline-depth"
						/>
					)}
				</span>
				{cropOpen ? (
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 z-20 rounded-full border-[3px] border-black"
					/>
				) : null}
				{value ? (
					<span
						className={`pointer-events-none absolute inset-0 rounded-full bg-black/25 opacity-0 transition-opacity duration-150 ease-out ${cropOpen ? "" : "group-hover/image:opacity-100"}`}
					/>
				) : null}
			</button>
			{value ? (
				<>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={
							cropOpen ? "Apply profile image crop" : "Crop profile image"
						}
						disabled={isUploading || !sourceSize.width}
						onClick={cropOpen ? closeCrop : openCrop}
						className={`smooth-shadow-xs absolute top-0 left-0 z-30 inline-flex items-center justify-center rounded-full border-0! bg-background opacity-0 outline-depth transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 ${isWide ? "page-wide:top-2 page-wide:left-2" : ""} ${cropOpen ? "bg-brand-green text-white! opacity-100 hover:bg-brand-green/80" : ""}`}
						style={{
							width: profileImageControlSize,
							height: profileImageControlSize,
						}}
					>
						<Crop
							className="stroke-[2.5px]"
							style={{
								width: profileImageControlIconSize,
								height: profileImageControlIconSize,
							}}
						/>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Remove profile image"
						disabled={isUploading || cropOpen}
						onClick={onRemove}
						className={`smooth-shadow-xs absolute z-30 inline-flex items-center justify-center rounded-full border-0! bg-background opacity-0 outline-depth transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 ${isWide ? "page-wide:top-2 top-0 page-wide:right-2 right-0" : "top-0 right-0"}`}
						style={{
							width: profileImageControlSize,
							height: profileImageControlSize,
						}}
					>
						<Trash2
							className="stroke-[2.5px]"
							style={{
								width: profileImageControlIconSize,
								height: profileImageControlIconSize,
							}}
						/>
					</Button>
				</>
			) : null}
			<input
				ref={inputRef}
				id="page-image-upload"
				type="file"
				accept={pageImageContentTypes.join(",")}
				disabled={isUploading}
				className="sr-only"
				onChange={handleChange}
			/>
		</div>
	);
}
