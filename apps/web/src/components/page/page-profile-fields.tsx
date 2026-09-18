"use client";

import { Field, FieldError, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupTextarea,
} from "@grabbin/ui/components/input-group";

import PageImageField from "./page-image-field";

export default function PageProfileFields({
	imageUrl,
	isImageUploading,
	onSelectImage,
	onRemoveImage,
	onImageError,
	name,
	bio,
	onNameChange,
	onBioChange,
	error,
}: {
	imageUrl: string;
	isImageUploading: boolean;
	onSelectImage: (file: File) => void;
	onRemoveImage: () => void;
	onImageError: (message: string) => void;
	name: string;
	bio: string;
	onNameChange: (value: string) => void;
	onBioChange: (value: string) => void;
	error: string;
}) {
	return (
		<FieldGroup className="gap-8">
			<Field data-invalid={!!error} className="gap-8">
				<PageImageField
					value={imageUrl}
					isUploading={isImageUploading}
					onSelect={onSelectImage}
					onRemove={onRemoveImage}
					onError={onImageError}
				/>
				<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
					<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0!">
						<InputGroupTextarea
							id="page-name"
							name="name"
							aria-label="Name"
							autoComplete="name"
							className="editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! p-0! font-bold text-3xl! leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-[40px]!"
							rows={1}
							placeholder="Name"
							required
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							aria-invalid={!!error}
							aria-describedby="profile-error"
						/>
					</InputGroup>
					<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0!">
						<InputGroupTextarea
							id="page-bio"
							name="bio"
							aria-label="Bio"
							className="editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! px-0.5! text-base! text-primary/80 leading-6 outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-xl! min-[90rem]:leading-8"
							rows={2}
							placeholder="Tell about you"
							value={bio}
							onChange={(event) => onBioChange(event.target.value)}
							aria-invalid={!!error}
							aria-describedby="profile-error"
						/>
					</InputGroup>
					<div id="profile-error" className="min-h-5" aria-live="polite">
						<FieldError className="text-xs">{error}</FieldError>
					</div>
				</div>
			</Field>
		</FieldGroup>
	);
}
