"use client";

import { type PageImageCrop, pageImageContentTypes } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Button } from "@grabbin/ui/components/button";
import { CircleFadingArrowUp, Crop } from "lucide-react";
import { useEffect, useRef } from "react";
import { Trash } from "@/components/trash";
import { usePageImageCrop } from "../hooks/use-page-image-crop";
import PageImageViewer from "./page-image-viewer";

export default function PageImageEditor({
	value,
	fallbackImageUrl,
	onImageLoaded,
	crop,
	onCropChange,
	onSelect,
	onRemove: handleRemove,
	isUploading = false,
	breakpoint = "wide",
}: {
	value: string;
	fallbackImageUrl: string;
	onImageLoaded: (loadedUrl: string) => void;
	crop?: PageImageCrop | null;
	onCropChange?: (crop: PageImageCrop | null) => void;
	onSelect: (file: File) => void;
	onRemove: () => void;
	isUploading?: boolean;
	breakpoint?: BentoBreakpoint;
}) {
	const isWide = breakpoint === "wide";
	const editorRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const {
		frameRef,
		imageRef,
		cropOpen,
		sourceSize,
		renderedCrop,
		cropStyle,
		controlSize,
		handleImageLoad,
		openCrop,
		closeCrop,
		resetDraft,
		handlePointerDown,
		handlePointerMove,
		handlePointerEnd,
	} = usePageImageCrop({
		value,
		crop,
		onCropChange,
		onImageLoaded,
	});
	const controlIconSize = Math.max(18, Math.round(controlSize / 2));

	useEffect(() => {
		if (!cropOpen) return;
		const handlePointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				editorRef.current?.contains(event.target)
			)
				return;
			resetDraft();
		};
		document.addEventListener("pointerdown", handlePointerDown, true);
		return () =>
			document.removeEventListener("pointerdown", handlePointerDown, true);
	}, [cropOpen, resetDraft]);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		onSelect(file);
		resetDraft();
	}

	return (
		<div
			ref={editorRef}
			data-page-image-crop-open={cropOpen ? "true" : undefined}
			className={`group/image relative isolate self-start ${cropOpen ? "z-[10000]" : ""} ${isWide ? "page-wide:size-46! size-28!" : "size-28!"}`}
		>
			<button
				ref={frameRef}
				type="button"
				aria-label="Change profile image"
				aria-busy={isUploading}
				disabled={isUploading}
				className={`relative flex size-full items-center justify-center rounded-full bg-brand-light-gray font-medium text-muted-foreground text-sm transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${cropOpen ? "cursor-move! touch-none overflow-visible" : "overflow-visible hover:bg-muted active:scale-[0.97]"}`}
				onClick={() => {
					if (!cropOpen) inputRef.current?.click();
				}}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerEnd}
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
								<PageImageViewer
									src={value}
									fallbackSrc={fallbackImageUrl}
									isWide={isWide}
									className={`size-full ${cropOpen ? "rounded-md" : "rounded-full object-cover"}`}
									imageRef={imageRef}
									onLoad={handleImageLoad}
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
							<PageImageViewer
								src={value}
								fallbackSrc={fallbackImageUrl}
								isWide={isWide}
								className={`size-full object-cover ${cropOpen ? "rounded-md" : "rounded-full"}`}
								imageRef={imageRef}
								onLoad={handleImageLoad}
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
						className={`smooth-shadow-xs absolute top-0 left-0 z-30 inline-flex items-center justify-center rounded-full border-0! bg-background opacity-0 outline-depth transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 ${isWide ? "page-wide:top-2 page-wide:left-2" : ""} ${cropOpen ? "cursor-move! bg-brand-green text-white! opacity-100 hover:bg-brand-green/80" : ""}`}
						style={{
							width: controlSize,
							height: controlSize,
						}}
					>
						<Crop
							className="stroke-[2.5px]"
							style={{
								width: controlIconSize,
								height: controlIconSize,
							}}
						/>
					</Button>
					{!cropOpen ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Remove profile image"
							disabled={isUploading}
							onClick={handleRemove}
							className={`smooth-shadow-xs absolute z-30 inline-flex items-center justify-center rounded-full border-0! bg-background opacity-0 outline-depth transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 ${isWide ? "page-wide:top-2 top-0 page-wide:right-2 right-0" : "top-0 right-0"}`}
							style={{
								width: controlSize,
								height: controlSize,
							}}
						>
							<Trash
								className="stroke-[2.5px]"
								style={{
									width: controlIconSize,
									height: controlIconSize,
								}}
							/>
						</Button>
					) : null}
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
