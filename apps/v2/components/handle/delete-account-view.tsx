"use client";

import { useState } from "react";
import { Loader } from "reicon-react";
import { Button } from "@/components/ui/button";
import type { createAuthClient } from "@/lib/auth/auth-client";

const DELETE_CONFIRMATION_CLICKS = 3;

type DeleteAccountViewProps = {
  authClient: ReturnType<typeof createAuthClient>;
  onBack: () => void;
};

export function DeleteAccountView({
  authClient,
  onBack,
}: DeleteAccountViewProps) {
  const [clicks, setClicks] = useState(0);
  const [sent, setSent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = clicks / DELETE_CONFIRMATION_CLICKS;
  const label =
    clicks === DELETE_CONFIRMATION_CLICKS
      ? "Come back anytime!"
      : clicks
        ? clicks === 2
          ? "Almost there"
          : "One more step"
        : "Begin account deletion";

  async function confirm() {
    if (clicks < DELETE_CONFIRMATION_CLICKS) {
      setClicks((value) => value + 1);
      return;
    }
    setDeleting(true);
    try {
      const result = await authClient.deleteUser({
        callbackURL: new URL("/", window.location.origin).toString(),
      });
      if (result.error)
        throw new Error(
          result.error.message ?? "Could not send the deletion email.",
        );
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send the deletion email.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col justify-between gap-8">
      {sent ? (
        <p className="text-base text-balance text-primary">
          Your inbox has the final step. Confirm when you’re ready, and we’ll
          take care of the rest.
          <span className="mt-4 block">
            See you again, whenever you’re ready.
          </span>
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-semibold">Leaving alreday?</h3>
            <div className="text-base text-balance text-primary">
              <p>Ready to move on?</p>
              <p>
                We’ll send one last confirmation before your account and page
                are permanently removed.
              </p>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={deleting}
              onClick={() => void confirm()}
              className="relative h-12 w-full overflow-hidden rounded-lg text-base"
            >
              <span className="relative z-0">
                {deleting ? <Loader className="animate-spin" /> : label}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-red-500 text-primary-foreground transition-[clip-path] duration-200"
                style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
              >
                {label}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="h-12 w-full rounded-lg text-base text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
      {sent ? (
        <p className="pt-4 text-sm italic text-muted-foreground">
          With care,
          <br />
          The founder
        </p>
      ) : null}
    </div>
  );
}
