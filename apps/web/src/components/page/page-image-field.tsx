"use client";

import { pageImageContentTypes } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import { CircleFadingArrowUp, Trash } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

const maxImageSize = 5 * 1024 * 1024;

export default function PageImageField({
	value,
	onSelect,
	onRemove,
	onError,
	isUploading = false,
}: {
	value: string;
	onSelect: (file: File) => void;
	onRemove: () => void;
	onError: (message: string) => void;
	isUploading?: boolean;
}) {
	const reduceMotion = useReducedMotion();
	const enterTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const };
	const inputRef = useRef<HTMLInputElement>(null);

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
	}

	return (
		<div className="group/image relative isolate size-28 sm:size-32 min-[90rem]:size-46">
			<button
				type="button"
				aria-label="Change profile image"
				aria-busy={isUploading}
				disabled={isUploading}
				className="relative flex size-full items-center justify-center overflow-visible rounded-full bg-brand-light-gray font-medium text-muted-foreground text-sm transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97]"
				onClick={() => inputRef.current?.click()}
			>
				<span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
					{value ? (
						<motion.img
							src={value}
							alt=""
							initial={reduceMotion ? false : { opacity: 0, rotate: -180 }}
							animate={{ opacity: 1, rotate: 0 }}
							transition={enterTransition}
							className="size-full rounded-lg object-cover"
						/>
					) : (
						<CircleFadingArrowUp
							className="size-6 2xl:size-9"
							strokeWidth={2.5}
							aria-hidden="true"
						/>
					)}
				</span>
				{value && (
					<span className="pointer-events-none absolute inset-0 rounded-full bg-black/25 opacity-0 transition-opacity duration-150 ease-out group-hover/image:opacity-100" />
				)}
			</button>
			{value && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Remove profile image"
					onClick={onRemove}
					className="smooth-shadow-xs absolute top-0 right-0 inline-flex size-10 items-center justify-center rounded-full border-0! bg-background opacity-0 outline-depth transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 min-[90rem]:top-2 min-[90rem]:right-2"
				>
					<Trash className="size-5 stroke-[2.5px]" />
				</Button>
			)}
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
