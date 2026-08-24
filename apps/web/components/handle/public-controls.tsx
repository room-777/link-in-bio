"use client";

import type { PageResponse } from "@grabbin/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPageLayoutClasses } from "@/lib/handle/page-layout";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";
import { MyPageLink } from "./my-page-link";
import { OwnerControls } from "./owner-controls";
import { PublicViews } from "./public-views";

type PublicControlsProps = {
  model: PublicHandleModel;
  apiBaseUrl: string;
  imageBaseUrl: string | null;
  siteOrigin: string;
  onPageChange: (page: PageResponse) => void;
};

export function PublicControls({
  model,
  apiBaseUrl,
  imageBaseUrl,
  siteOrigin,
  onPageChange,
}: PublicControlsProps) {
  return (
    <aside
      className={`relative flex flex-col items-center gap-2 py-24 pt-0 z-10 min-[90rem]:flex-row min-[90rem]:py-0 ${getPageLayoutClasses("wide").controls}`}
      aria-label="Page controls"
    >
      <div
        className={
          model.isSignedIn
            ? "flex flex-col items-center gap-2 min-[90rem]:flex-row min-[90rem]:gap-0"
            : "flex items-center gap-0"
        }
      >
        <div
          className={
            model.isSignedIn
              ? "order-2 flex flex-row items-center justify-center gap-1 min-[90rem]:order-none min-[90rem]:contents"
              : "contents"
          }
        >
          {model.isCurrentUserPage ? (
            <OwnerControls
              page={model.page}
              hasAccess={model.entitlements.hasAccess}
              isPrimaryPage={model.isPrimaryPage}
              readOnly={model.readOnly}
              apiBaseUrl={apiBaseUrl}
              imageBaseUrl={imageBaseUrl}
              siteOrigin={siteOrigin}
              onPageChange={onPageChange}
            />
          ) : !model.isSignedIn ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/log-in?redirect=/${encodeURIComponent(model.page.handle)}`}
                />
              }
              variant="ghost"
              size="sm"
              className="rounded-md text-muted-foreground"
            >
              Log in
            </Button>
          ) : null}
          <Button
            nativeButton={false}
            render={
              <a
                href="https://discord.gg/U4NNF9hMms"
                target="_blank"
                rel="noreferrer"
              >
                Community
              </a>
            }
            variant="ghost"
            size="sm"
            className="rounded-md text-muted-foreground/80"
          />
          {model.visitorsEnabled ? (
            <PublicViews pageId={model.page.id} />
          ) : null}
        </div>
        {!model.isCurrentUserPage ? (
          <MyPageLink
            enabled={model.isSignedIn && !model.isCurrentUserPage}
            imageBaseUrl={imageBaseUrl}
          />
        ) : null}
      </div>
    </aside>
  );
}
