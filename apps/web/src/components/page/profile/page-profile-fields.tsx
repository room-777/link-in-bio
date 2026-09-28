"use client";

import type { PageImageCrop } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Field, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupTextarea,
} from "@grabbin/ui/components/input-group";

import { MadeWithGrabbinBadge } from "../shared/page-footer";
import PageImageField from "./page-image-field";

export default function PageProfileFields({
	imageUrl,
	isImageUploading,
	onSelectImage,
	onRemoveImage,
	onImageError,
	imageCrop,
	onImageCropChange,
	name,
	bio,
	onNameChange,
	onBioChange,
	error,
	nameRequired,
	breakpoint = "wide",
}: {
	imageUrl: string;
	isImageUploading: boolean;
	onSelectImage: (file: File) => void;
	onRemoveImage: () => void;
	onImageError: (message: string) => void;
	imageCrop?: PageImageCrop | null;
	onImageCropChange?: (crop: PageImageCrop | null) => void;
	name: string;
	bio: string;
	onNameChange: (value: string) => void;
	onBioChange: (value: string) => void;
	error: string;
	nameRequired: boolean;
	breakpoint?: BentoBreakpoint;
}) {
	const isWide = breakpoint === "wide";
	return (
		<FieldGroup className="gap-8">
			<Field data-invalid={!!error} className="gap-8">
				<div className="flex w-full items-center justify-between min-[90rem]:justify-start">
					<PageImageField
						value={imageUrl}
						isUploading={isImageUploading}
						onSelect={onSelectImage}
						onRemove={onRemoveImage}
						onError={onImageError}
						crop={imageCrop}
						onCropChange={onImageCropChange}
						breakpoint={breakpoint}
					/>
					<div className="min-[90rem]:hidden">
						<MadeWithGrabbinBadge />
					</div>
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0! has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
						<InputGroupTextarea
							id="page-name"
							name="name"
							aria-label="Name"
							autoComplete="name"
							className={`editable-paragraph field-sizing-content min-h-fit! w-full min-w-0 max-w-full whitespace-pre-wrap break-words border-0! bg-transparent! p-0! pr-1! font-bold leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out ${isWide ? "min-[90rem]:!text-[40px] text-3xl!" : "text-3xl!"}`}
							rows={1}
							placeholder="Name"
							required={nameRequired}
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							aria-invalid={!!error}
							aria-describedby="profile-error"
						/>
					</InputGroup>
					<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0! has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
						<InputGroupTextarea
							id="page-bio"
							name="bio"
							aria-label="Bio"
							className={`editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! px-0.5! text-primary/80 leading-6 outline-none transition-[background-color,box-shadow] duration-150 ease-out ${isWide ? "text-base! min-[90rem]:text-xl! min-[90rem]:leading-8" : "text-base!"}`}
							rows={2}
							placeholder="Tell about you"
							value={bio}
							onChange={(event) => onBioChange(event.target.value)}
							aria-invalid={!!error}
							aria-describedby="profile-error"
						/>
					</InputGroup>
				</div>
			</Field>
		</FieldGroup>
	);
}
