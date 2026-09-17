"use client";

import { Button } from "@grabbin/ui/components/button";
import { CircleFadingArrowUp, Trash2 } from "lucide-react";
import { useRef } from "react";

const supportedTypes = new Set([
	"image/avif",
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
]);
const maxImageSize = 5 * 1024 * 1024;

export default function PageImageField({
	value,
	onChange,
	onError,
}: {
	value: string;
	onChange: (value: string) => void;
	onError: (message: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (!supportedTypes.has(file.type) || file.size > maxImageSize) {
			onError("Choose an image smaller than 5 MB.");
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") onChange(reader.result);
		};
		reader.onerror = () => onError("The image could not be loaded.");
		reader.readAsDataURL(file);
	}

	return (
		<div className="group/image relative isolate size-28 sm:size-32 min-[90rem]:size-46">
			<button
				type="button"
				aria-label="Change profile image"
				className="relative flex size-full items-center justify-center overflow-visible rounded-full bg-brand-light-gray font-medium text-muted-foreground text-sm transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97]"
				onClick={() => inputRef.current?.click()}
			>
				<span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
					{value ? (
						<img
							src={value}
							alt=""
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
					onClick={() => onChange("")}
					className="absolute top-0 right-0 inline-flex size-10 items-center justify-center rounded-full border-0! bg-background opacity-0 shadow-black transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 min-[90rem]:top-2 min-[90rem]:right-2"
				>
					<Trash2 className="size-5 stroke-3" />
				</Button>
			)}
			<input
				ref={inputRef}
				id="page-image-upload"
				type="file"
				accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
				className="sr-only"
				onChange={handleChange}
			/>
		</div>
	);
}
