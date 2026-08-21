"use client";

import type { PageResponse } from "@grabbin/api";
import { PRO_MONTHLY_PRODUCT_ID } from "@grabbin/plan";
import { useQuery } from "@tanstack/react-query";
import { Settings2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader } from "reicon-react";
import { SharedLayoutBg } from "@/components/motion/shared-layout-bg";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createAuthClient } from "@/lib/auth/auth-client";
import { getOwnedPages, ownedPagesQueryKey } from "@/lib/client/page-api";
import { ChangeHandleView } from "./change-handle-view";
import { DeleteAccountView } from "./delete-account-view";
import { SwitchPageContent } from "./switch-page-content";

type OwnerControlsProps = {
  page: PageResponse;
  hasAccess: boolean;
  isPrimaryPage: boolean;
  readOnly: boolean;
  apiBaseUrl: string;
  imageBaseUrl?: string | null;
  siteOrigin: string;
  onPageChange: (page: PageResponse) => void;
};

type SettingsView = "menu" | "handle" | "delete";

export function OwnerControls({
  page,
  hasAccess,
  isPrimaryPage,
  readOnly,
  apiBaseUrl,
  imageBaseUrl,
  siteOrigin,
  onPageChange,
}: OwnerControlsProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SettingsView>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState(false);
  const [handle, setHandle] = useState(page.handle);
  const [handleSuccess, setHandleSuccess] = useState(false);
  const [switchPageOpen, setSwitchPageOpen] = useState(false);
  const [pageDeleteOpen, setPageDeleteOpen] = useState(false);
  const router = useRouter();
  const {
    data: ownedPages,
    isPending: isOwnedPagesPending,
    error: ownedPagesError,
  } = useQuery({
    queryKey: ownedPagesQueryKey,
    queryFn: getOwnedPages,
    enabled: open && (switchPageOpen || pageDeleteOpen),
    throwOnError: false,
  });
  const primary = ownedPages?.pages.find((candidate) => candidate.isPrimary);
  const authClient = useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    setHandle(page.handle);
  }, [page.handle]);

  async function changePlan() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setBillingError(false);
    try {
      const result = hasAccess
        ? await authClient.creem.createPortal()
        : await authClient.creem.createCheckout({
            productId: PRO_MONTHLY_PRODUCT_ID,
          });
      if (result.error || !result.data?.url)
        throw new Error("Billing could not be opened.");
      window.location.assign(result.data.url);
    } catch {
      setBillingError(true);
    } finally {
      setBusy(false);
    }
  }

  async function deletePage() {
    if (busy || isPrimaryPage || !primary || primary.handle === page.handle)
      return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pages/${encodeURIComponent(page.handle)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Could not delete page.");
      setPageDeleteOpen(false);
      setOpen(false);
      window.location.assign(`/${encodeURIComponent(primary.handle)}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not delete page.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not log out.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not log out.");
    } finally {
      setBusy(false);
    }
  }

  const deletePageControl = (
    <Popover open={pageDeleteOpen} onOpenChange={setPageDeleteOpen}>
      <PopoverTrigger
        render={<button type="button" />}
        disabled={busy || isPrimaryPage}
        className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium text-gray-bright disabled:opacity-50"
      >
        Delete page
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-80 gap-1 rounded-2xl bg-background p-4"
      >
        <PopoverTitle className="text-xl font-semibold">
          Delete page?
        </PopoverTitle>
        <PopoverDescription className="text-base text-primary">
          Your contents will be permanently removed.
        </PopoverDescription>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="mt-6 h-12 w-full rounded-lg text-base"
          disabled={
            busy ||
            isOwnedPagesPending ||
            !primary ||
            primary.handle === page.handle
          }
          onClick={() => void deletePage()}
        >
          {busy ? <Loader className="animate-spin" /> : "Delete page"}
        </Button>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="contents">
      <div className="flex items-center gap-1">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setView("menu");
              setSwitchPageOpen(false);
              setPageDeleteOpen(false);
              setHandleSuccess(false);
              setError(null);
              setBillingError(false);
            }
          }}
        >
          <PopoverTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label="Settings"
            className="rounded-md text-muted-foreground"
          >
            <Settings2Icon />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={12}
            className={`${view === "handle" || handleSuccess ? "w-88" : view === "delete" ? "w-80" : "w-64"} t-resize overflow-hidden rounded-2xl bg-background p-2 beautiful-shadow! ${view === "delete" ? "rounded-4xl p-4" : ""}`}
          >
            <div
              className="t-page-slide t-resize"
              data-page={view === "menu" ? "1" : "2"}
              data-view={view}
              data-plan={hasAccess ? "pro" : "free"}
              data-billing-error={billingError ? "true" : undefined}
              data-success={handleSuccess ? "true" : undefined}
            >
              <section className="t-page" data-page-id="1">
                <SharedLayoutBg className="px-5">
                  <button
                    type="button"
                    disabled={readOnly}
                    className="relative flex h-15 w-full flex-col items-start justify-center gap-0 rounded-lg text-left font-medium"
                    onClick={() => setView("handle")}
                  >
                    <span>Change handle</span>
                    <span className="text-muted-foreground/80">
                      /{page.handle}
                    </span>
                  </button>
                  <Popover
                    open={switchPageOpen}
                    onOpenChange={setSwitchPageOpen}
                  >
                    <PopoverTrigger
                      render={<button type="button" />}
                      className="relative flex h-15 w-full flex-col items-start justify-center gap-0 rounded-lg text-left font-medium"
                    >
                      <span>Switch page</span>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={12}
                      className="w-64 gap-1 rounded-2xl bg-background p-2"
                    >
                      <SwitchPageContent
                        pages={ownedPages?.pages ?? []}
                        isPending={isOwnedPagesPending}
                        error={ownedPagesError}
                        imageBaseUrl={imageBaseUrl}
                        onSelect={() => {
                          setSwitchPageOpen(false);
                          setOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    type="button"
                    disabled={busy}
                    aria-busy={busy}
                    className="relative flex h-15 w-full flex-col items-start justify-center gap-0 rounded-lg text-left font-medium"
                    onClick={() => void changePlan()}
                  >
                    {busy ? (
                      <span className="flex w-full justify-center">
                        <Loader className="size-4 animate-spin" />
                      </span>
                    ) : (
                      <>
                        <span>Change plan</span>
                        <span
                          className={
                            billingError
                              ? "text-destructive"
                              : "text-muted-foreground/80"
                          }
                          role={billingError ? "alert" : undefined}
                        >
                          {billingError
                            ? "Billing could not be opened."
                            : hasAccess
                              ? "Pro"
                              : "Free"}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium"
                    onClick={() => void logOut()}
                  >
                    Log out
                  </button>
                  <button
                    type="button"
                    className="flex h-15 w-full items-center justify-start rounded-lg text-left font-medium"
                    onClick={() => setView("delete")}
                  >
                    Delete Account
                  </button>
                  {!isPrimaryPage ? deletePageControl : null}
                  {error ? (
                    <div className="px-2 text-xs text-destructive" role="alert">
                      {error}
                    </div>
                  ) : null}
                </SharedLayoutBg>
                {isPrimaryPage ? (
                  <div className="px-5">{deletePageControl}</div>
                ) : null}
              </section>
              <section className="t-page" data-page-id="2">
                {view === "handle" ? (
                  <ChangeHandleView
                    page={page}
                    handle={handle}
                    siteOrigin={siteOrigin}
                    readOnly={readOnly}
                    busy={busy}
                    onHandleChange={setHandle}
                    onBack={() => {
                      setHandleSuccess(false);
                      setView("menu");
                    }}
                    onSaved={(nextPage) => {
                      onPageChange(nextPage);
                      setHandle(nextPage.handle);
                      setHandleSuccess(true);
                      window.history.replaceState(
                        window.history.state,
                        "",
                        `/${encodeURIComponent(nextPage.handle)}`,
                      );
                    }}
                    onSuccessChange={setHandleSuccess}
                    onBusy={setBusy}
                  />
                ) : (
                  <DeleteAccountView
                    authClient={authClient}
                    onBack={() => setView("menu")}
                  />
                )}
              </section>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
