"use client";

import {
  type Breakpoint,
  getPageLayoutClasses,
} from "@/lib/handle/page-layout";
import { getPublicPageTitle } from "@/lib/handle/public-page-copy";
import { createPublicImageUrl } from "@/lib/image/public-image-url";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";
import { PrimaryPageAction } from "./primary-page-action";
import { ProfileEditor } from "./profile-editor";
import { ProfileImage } from "./profile-image";

export function PublicProfile({
  model,
  breakpoint,
  imageBaseUrl,
  onSavingChange,
}: {
  model: PublicHandleModel;
  breakpoint: Breakpoint;
  imageBaseUrl: string | null;
  onSavingChange?: (isSaving: boolean) => void;
}) {
  const title = getPublicPageTitle(model.page);
  const image = createPublicImageUrl(
    model.page.image,
    model.page.updatedAt,
    imageBaseUrl,
  );
  const layoutClasses = getPageLayoutClasses(breakpoint);
  const showPrimaryPageAction =
    model.isCurrentUserPage &&
    model.entitlements.hasAccess &&
    !model.isPrimaryPage;

  if (model.mode === "edit") {
    return (
      <>
        <ProfileEditor
          initialPage={model.page}
          isDemo={model.isDemo}
          imageUrl={image}
          imageBaseUrl={imageBaseUrl}
          breakpoint={breakpoint}
          onSavingChange={onSavingChange}
        />
        {showPrimaryPageAction ? (
          <PrimaryPageAction handle={model.page.handle} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div>
        <ProfileImage
          imageUrl={image}
          title={title}
          crop={model.page.imageCrop}
          breakpoint={breakpoint}
        />
      </div>
      <div
        className={`flex min-w-0 flex-col gap-2 ${layoutClasses.profileDetails}`}
      >
        <p
          className={`text-3xl font-bold leading-tight tracking-tight ${layoutClasses.name}`}
        >
          {title}
        </p>
        {model.page.bio?.trim() ? (
          <p
            className={`whitespace-pre-wrap px-0.5 text-base leading-6 text-primary/80 ${layoutClasses.bio}`}
          >
            {model.page.bio}
          </p>
        ) : null}
        {model.readOnly && !model.isPrimaryPage ? (
          <p className="text-base text-muted-foreground">
            Non-primary pages are read-only and will be deleted soon.
            <br />
            Upgrade your plan before these pages are deleted.
          </p>
        ) : null}
        {showPrimaryPageAction ? (
          <PrimaryPageAction handle={model.page.handle} />
        ) : null}
      </div>
    </>
  );
}
