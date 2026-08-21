import Link from "next/link";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { widePageLayout } from "@/lib/handle/page-layout";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";
import { MyPageLink } from "./my-page-link";
import { OwnerControls } from "./owner-controls";
import { PublicViews } from "./public-views";

export function PublicControls({ model }: { model: PublicHandleModel }) {
  return (
    <aside
      className={`relative flex flex-col items-center gap-2 py-24 pt-0 z-10 min-[90rem]:flex-row min-[90rem]:py-0 ${widePageLayout.controls}`}
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
              apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
              imageBaseUrl={env.NEXT_PUBLIC_R2_PUBLIC_URL}
              siteOrigin={env.NEXT_PUBLIC_APP_URL}
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
            imageBaseUrl={env.NEXT_PUBLIC_R2_PUBLIC_URL}
          />
        ) : null}
      </div>
    </aside>
  );
}
