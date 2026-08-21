"use client";

import type { PageResponse } from "@grabbin/api";
import { useEffect, useState } from "react";
import {
  type Breakpoint,
  getPageLayoutClasses,
} from "@/lib/handle/page-layout";
import { usePageAutoSave } from "@/lib/page/use-page-auto-save";
import { ProfileImageEditor } from "./profile-image-editor";

type ProfileEditorProps = {
  initialPage: PageResponse;
  imageUrl: string | null;
  imageBaseUrl: string | null;
  breakpoint: Breakpoint;
  onSavingChange?: (isSaving: boolean) => void;
};

export function ProfileEditor({
  initialPage,
  imageUrl,
  imageBaseUrl,
  breakpoint,
  onSavingChange,
}: ProfileEditorProps) {
  const [imageError, setImageError] = useState<string | null>(null);
  const {
    acceptPage,
    draft,
    error: saveError,
    isSaving,
    save,
    updateField,
  } = usePageAutoSave(initialPage);
  const page = { ...initialPage, ...draft };
  const layoutClasses = getPageLayoutClasses(breakpoint);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  return (
    <>
      <ProfileImageEditor
        page={page}
        imageUrl={imageUrl}
        imageBaseUrl={imageBaseUrl}
        acceptPage={acceptPage}
        save={save}
        onErrorChange={setImageError}
        breakpoint={breakpoint}
      />
      <div
        className={`flex min-w-0 flex-col gap-2 ${layoutClasses.profileDetails}`}
      >
        <textarea
          aria-label="Name"
          className={`editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap outline-none transition-[background-color,box-shadow] duration-150 ease-out text-3xl font-bold leading-tight tracking-tight ${layoutClasses.name}`}
          rows={1}
          value={page.name ?? ""}
          placeholder="Name"
          onChange={(event) => updateField("name", event.target.value)}
        />
        <textarea
          aria-label="Bio"
          className={`editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap px-0.5 text-base leading-6 text-primary/80 outline-none transition-[background-color,box-shadow] duration-150 ease-out ${layoutClasses.bio}`}
          rows={2}
          value={page.bio ?? ""}
          placeholder="Tell about you"
          onChange={(event) => updateField("bio", event.target.value)}
        />
        {imageError || saveError ? (
          <p className="text-sm text-destructive">{imageError ?? saveError}</p>
        ) : null}
      </div>
    </>
  );
}
