"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import type { OtpStatus } from "@/components/ui/otp-input";
import { createAuthClient } from "@/lib/auth/auth-client";

type Provider = "google" | "twitter" | "otp";

export function useLogInFlow(redirectTo: string, apiBaseUrl: string) {
  const authClient = useMemo(() => createAuthClient(apiBaseUrl), [apiBaseUrl]);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [showSuccessButton, setShowSuccessButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailWrapRef = useRef<HTMLDivElement>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearEmailError() {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    shakeTimerRef.current = null;
    revertTimerRef.current = null;
    emailWrapRef.current?.classList.remove("is-error");
    emailInputRef.current?.classList.remove("is-error", "is-shaking");
  }

  function showEmailError(message: string) {
    setError(message);
    const wrap = emailWrapRef.current;
    const input = emailInputRef.current;
    if (!wrap || !input) return;

    wrap.classList.add("is-error");
    input.classList.add("is-error");
    input.classList.remove("is-shaking");
    void input.offsetWidth;
    input.classList.add("is-shaking");

    const rootStyles = getComputedStyle(document.documentElement);
    const motionMs = (name: string, fallback: number) => {
      const value = Number.parseFloat(rootStyles.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const shakeMs =
      motionMs("--shake-dur-a", 80) * 2 + motionMs("--shake-dur-b", 60) * 2;
    shakeTimerRef.current = setTimeout(() => {
      input.classList.remove("is-shaking");
      shakeTimerRef.current = null;
    }, shakeMs + 20);

    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    revertTimerRef.current = setTimeout(() => {
      wrap.classList.remove("is-error");
      input.classList.remove("is-error");
      revertTimerRef.current = null;
    }, motionMs("--revert-hold", 3000) + shakeMs);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    clearEmailError();
    setError(null);
  }

  async function handleSocialSignIn(provider: Exclude<Provider, "otp">) {
    setError(null);
    setPendingProvider(provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: new URL(redirectTo, window.location.origin).toString(),
        newUserCallbackURL: new URL("/new", window.location.origin).toString(),
      });
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = emailInputRef.current;
    if (!input) return;
    if (!input.validity.valid) {
      showEmailError(
        input.validity.valueMissing
          ? "Please enter your email address."
          : "Please enter a valid email address.",
      );
      return;
    }

    clearEmailError();
    setError(null);
    setPendingProvider("otp");
    try {
      const { error: sendError } =
        await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
        });
      if (sendError) {
        showEmailError(sendError.message ?? "Could not send the code.");
        return;
      }
      setOtp("");
      setStatus("idle");
      setOtpSent(true);
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleOtpComplete(code: string) {
    setError(null);
    setStatus("idle");
    setShowSuccessButton(false);
    setPendingProvider("otp");
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email,
        otp: code,
      });
      if (signInError) {
        setStatus("error");
        setError(signInError.message ?? "That code is not valid.");
        return;
      }
      setStatus("success");
    } finally {
      setPendingProvider(null);
    }
  }

  function handleOtpChange(value: string) {
    setOtp(value);
    setStatus("idle");
    setShowSuccessButton(false);
    setError(null);
  }

  function handleUseDifferentEmail() {
    clearEmailError();
    setError(null);
    setOtp("");
    setStatus("idle");
    setShowSuccessButton(false);
    setOtpSent(false);
  }

  return {
    pendingProvider,
    email,
    otp,
    otpSent,
    status,
    showSuccessButton,
    error,
    emailInputRef,
    emailWrapRef,
    handleEmailChange,
    handleSocialSignIn,
    handleSendOtp,
    handleOtpComplete,
    handleOtpChange,
    handleUseDifferentEmail,
    setShowSuccessButton,
  };
}

export type LogInFlow = ReturnType<typeof useLogInFlow>;
