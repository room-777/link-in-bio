"use client";

import { SpinnerGapIcon } from "@phosphor-icons/react";
import { IconGoogle, IconXTwitter } from "nucleo-social-media";
import { ButtonContentTransition } from "@/components/auth/button-content-transition";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { LogInFlow } from "@/hooks/use-log-in-flow";

export function LogInEmailStep({ flow }: { flow: LogInFlow }) {
  const {
    email,
    emailInputRef,
    emailWrapRef,
    error,
    pendingProvider,
    handleEmailChange,
    handleSocialSignIn,
  } = flow;

  return (
    <div className="t-page min-w-0" data-page-id="1">
      <header className="flex flex-col gap-0.5">
        <img src="/favicon.svg" alt="Grabbin" className="mb-4 size-16" />
        <h1 className="text-xl font-medium">Good to see you again.</h1>
        <p className="text-sm text-muted-foreground">
          Create your beautiful page in seconds.
        </p>
      </header>

      <div className="mt-10 space-y-0">
        <div ref={emailWrapRef} className="t-input-wrap space-y-1.5">
          <label className="sr-only" htmlFor="login-email">
            Email address
          </label>
          <InputGroup className="h-12 rounded-lg">
            <InputGroupInput
              ref={emailInputRef}
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="Email"
              aria-describedby="login-email-error"
              aria-invalid={Boolean(error)}
              autoComplete="email"
              required
              disabled={pendingProvider !== null}
              className="t-input h-12 text-base"
            />
            <InputGroupAddon align="inline-end" className="pr-2">
              <InputGroupButton
                type="submit"
                variant="outline"
                size="sm"
                className="smooth-shadow-ring-sm h-9 rounded-md border-0 px-4 font-medium text-primary shadow-neutral-700 smooth-ring-neutral-300/30 hover:bg-background"
                disabled={pendingProvider !== null}
              >
                <ButtonContentTransition
                  isPending={pendingProvider === "otp"}
                  idle="Send code"
                  pending={
                    <>
                      <SpinnerGapIcon
                        className="size-5 animate-spin"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Sending…</span>
                    </>
                  }
                />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p
            id="login-email-error"
            className="t-error-msg min-h-4 text-left text-xs text-destructive/80"
            role="alert"
          >
            {error}
          </p>
        </div>

        <div className="flex flex-row gap-1 pt-3">
          <Button
            variant="brand"
            size="lg"
            className="h-12 w-full flex-1 rounded-lg text-base font-medium"
            disabled={pendingProvider !== null}
            onClick={() => void handleSocialSignIn("google")}
          >
            <ButtonContentTransition
              isPending={pendingProvider === "google"}
              idle={
                <>
                  <IconGoogle className="size-5" />
                  Google
                </>
              }
              pending={
                <>
                  <SpinnerGapIcon
                    className="size-5 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Signing in with Google…</span>
                </>
              }
            />
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-12 w-full flex-1 rounded-lg text-base font-medium"
            disabled={pendingProvider !== null}
            onClick={() => void handleSocialSignIn("twitter")}
          >
            <ButtonContentTransition
              isPending={pendingProvider === "twitter"}
              idle={
                <>
                  <IconXTwitter />X
                </>
              }
              pending={
                <>
                  <SpinnerGapIcon
                    className="size-5 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Signing in with X…</span>
                </>
              }
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
