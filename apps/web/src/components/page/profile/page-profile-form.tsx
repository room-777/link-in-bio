"use client";

import type { PageData } from "@grabbin/api";
import type { BentoBreakpoint } from "@grabbin/bento-layout";
import { Field, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupTextarea,
} from "@grabbin/ui/components/input-group";
import { toast } from "@grabbin/ui/components/toast";
import { motion } from "motion/react";
import { useEffect } from "react";
import { usePageProfileEntryAnimation } from "@/hooks/use-page-profile-entry-animation";
import { usePageProfileForm } from "@/hooks/use-page-profile-form";
import { MadeWithGrabbinBadge } from "../shared/made-with-grabbin-badge";
import PageImageField from "./page-image-field";

export default function PageProfileForm({
	page,
	demoMode = false,
	breakpoint = "wide",
	entryReady = true,
	entryAnimationRevision = 0,
	onSavingChange,
}: {
	page: PageData;
	demoMode?: boolean;
	breakpoint?: BentoBreakpoint;
	entryReady?: boolean;
	entryAnimationRevision?: number;
	onSavingChange?: (isSaving: boolean) => void;
}) {
	const profile = usePageProfileForm(page, demoMode);
	const animation = usePageProfileEntryAnimation(
		entryReady,
		entryAnimationRevision,
	);
	const isSaving = profile.status === "saving";
	const isWide = breakpoint === "wide";

	useEffect(() => {
		onSavingChange?.(isSaving);
	}, [isSaving, onSavingChange]);

	useEffect(() => {
		if (profile.error) toast({ message: profile.error, state: "error" });
	}, [profile.error]);

	return (
		<div className="w-full">
			<motion.div {...animation} className="w-full">
				<div className="mb-4 flex flex-col gap-8">
					<FieldGroup className="gap-8">
						<Field data-invalid={!!profile.error} className="gap-8">
							<div className="flex w-full items-center page-wide:justify-start justify-between">
								<PageImageField
									value={profile.imageUrl}
									fallbackImageUrl={profile.previewImageUrl}
									onImageLoaded={profile.onImageLoaded}
									isUploading={profile.isImageUploading || isSaving}
									onSelect={profile.onImageSelect}
									onRemove={profile.onImageRemove}
									onError={(message) => toast({ message, state: "error" })}
									crop={profile.draft.imageCrop}
									onCropChange={(crop) =>
										profile.updateField("imageCrop", crop)
									}
									breakpoint={breakpoint}
								/>
								{!demoMode ? (
									<div className="page-wide:hidden">
										<MadeWithGrabbinBadge />
									</div>
								) : null}
							</div>
							<div className="flex min-w-0 flex-col gap-2">
								<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0! has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
									<InputGroupTextarea
										id="page-name"
										name="name"
										aria-label="Name"
										autoComplete="name"
										className={`editable-paragraph field-sizing-content wrap-break-word min-h-fit! w-full min-w-0 max-w-full whitespace-pre-wrap border-0! bg-transparent! p-0! pr-1! font-bold leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out ${isWide ? "page-wide:text-profile-name-desktop! text-profile-name!" : "text-profile-name!"}`}
										rows={1}
										placeholder="Name"
										required={false}
										value={profile.draft.name}
										onChange={(event) =>
											profile.updateField("name", event.target.value)
										}
										aria-invalid={!!profile.error}
										aria-describedby="profile-error"
									/>
								</InputGroup>
								<InputGroup className="h-auto rounded-none bg-transparent focus-within:ring-0! has-[[data-slot=input-group-control][aria-invalid=true]]:ring-0!">
									<InputGroupTextarea
										id="page-bio"
										name="bio"
										aria-label="Bio"
										className={`editable-paragraph field-sizing-content min-h-fit! w-full overflow-hidden whitespace-pre-wrap border-0! bg-transparent! px-0.5! text-primary/70 leading-6 tracking-normal outline-none transition-[background-color,box-shadow] duration-150 ease-out ${isWide ? "page-wide:text-xl! text-base! page-wide:leading-8 page-wide:tracking-tight" : "text-base!"}`}
										rows={2}
										placeholder="Tell about you"
										value={profile.draft.bio}
										onChange={(event) =>
											profile.updateField("bio", event.target.value)
										}
										aria-invalid={!!profile.error}
										aria-describedby="profile-error"
									/>
								</InputGroup>
							</div>
						</Field>
					</FieldGroup>
				</div>
			</motion.div>
		</div>
	);
}
