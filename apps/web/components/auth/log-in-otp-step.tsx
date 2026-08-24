"use client";

import { SpinnerGapIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { CheckCircle } from "reicon-react";
import { ButtonContentTransition } from "@/components/auth/button-content-transition";
import { Button } from "@/components/ui/button";
import OtpInput from "@/components/ui/otp-input";
import type { LogInFlow } from "@/hooks/use-log-in-flow";

function SuccessCheck({ visible }: { visible: boolean }) {
  return (
    <span
      className="t-success-check inline-flex size-8 shrink-0 text-green-500"
      data-state={visible ? "in" : undefined}
      aria-hidden="true"
    >
      <CheckCircle weight="Filled" className="size-8" />
    </span>
  );
}

export function LogInOtpStep({ flow }: { flow: LogInFlow }) {
  const {
    email,
    otp,
    otpSent,
    status,
    showSuccessButton,
    error,
    pendingProvider,
    handleOtpChange,
    handleOtpComplete,
    handleUseDifferentEmail,
    setShowSuccessButton,
  } = flow;

  return (
    <div
      className="t-page flex flex-col items-start gap-8"
      data-page-id="2"
      aria-live="polite"
      aria-busy={pendingProvider === "otp"}
    >
      <div className="flex flex-col gap-2">
        <SuccessCheck visible={otpSent} />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification code to{" "}
            <span className="text-primary">{email}</span>. It expires in 5
            minutes.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center">
        <OtpInput
          length={6}
          value={otp}
          size="md"
          status={status}
          disabled={pendingProvider !== null || status === "success"}
          onSuccessAnimationComplete={() => setShowSuccessButton(true)}
          onChange={handleOtpChange}
          onComplete={(code) => void handleOtpComplete(code)}
        />
        <p
          className="t-success-error mt-3 min-h-4 text-xs text-destructive/80"
          data-state={error && otpSent ? "visible" : "hidden"}
          role="alert"
        >
          {otpSent ? error : null}
        </p>
      </div>

      <div className="t-login-action-stack">
        <div
          className="t-login-resend-actions flex w-full flex-col gap-0.5"
          data-state={status === "success" ? "hidden" : "visible"}
          aria-hidden={status === "success"}
        >
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="w-full rounded-md font-medium text-muted-foreground"
            disabled={pendingProvider !== null || status === "success"}
            tabIndex={status === "success" ? -1 : undefined}
          >
            <ButtonContentTransition
              isPending={pendingProvider === "otp"}
              idle="Resend code"
              pending={
                <>
                  <SpinnerGapIcon
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Sending…
                </>
              }
            />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="link"
            onClick={handleUseDifferentEmail}
            className="rounded-2xl text-xs font-medium text-muted-foreground no-underline! hover:text-primary"
            disabled={status === "success"}
            tabIndex={status === "success" ? -1 : undefined}
          >
            Use a different email
          </Button>
        </div>

        {status === "success" ? (
          <div
            className="t-login-success-action w-full"
            data-state={showSuccessButton ? "visible" : "hidden"}
            aria-hidden={!showSuccessButton}
          >
            <Button
              nativeButton={false}
              variant="secondary"
              size="lg"
              className="h-12 w-full rounded-lg text-base font-medium"
              render={
                <Link
                  href={"/new" as never}
                  tabIndex={showSuccessButton ? 0 : -1}
                >
                  Create your page
                </Link>
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
