"use client";

import type { HandleAvailabilityResponse } from "@grabbin/api";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { checkPageHandle, createPage } from "@/lib/client/page-api";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";

export function useCreatePageFlow({
  onCreated,
}: {
  onCreated: (handle: string) => void;
}) {
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [isRoleStep, setIsRoleStep] = useState(false);
  const [availability, setAvailability] =
    useState<HandleAvailabilityResponse | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const handleStatus = useMemo(
    () => getHandleAvailabilityStatus(handle, availability, isCheckingHandle),
    [handle, availability, isCheckingHandle],
  );

  useEffect(() => {
    setSubmitError(null);
    if (!handle.trim()) {
      setAvailability(null);
      setIsCheckingHandle(false);
      return;
    }

    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      setIsCheckingHandle(true);
      try {
        const result = await checkPageHandle(handle);
        if (isCurrent) setAvailability(result);
      } catch {
        if (isCurrent) {
          setAvailability(null);
          setSubmitError("Could not check this handle. Try again.");
        }
      } finally {
        if (isCurrent) setIsCheckingHandle(false);
      }
    }, 400);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [handle]);

  async function createPageWithRole(selectedRole: string | null) {
    if (isCreatingPage) return;

    setIsCreatingPage(true);
    setSubmitError(null);
    try {
      const response = await createPage({
        handle: handleStatus.normalizedHandle,
        name: null,
        role: selectedRole,
      });
      onCreated(response.page.handle);
    } catch {
      setSubmitError("Could not create your page. Try again.");
    } finally {
      setIsCreatingPage(false);
    }
  }

  function onHandleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!handleStatus.canCreatePage || isCreatingPage) return;
    setSubmitError(null);
    setIsRoleStep(true);
  }

  function onRoleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createPageWithRole(role);
  }

  return {
    handle,
    setHandle,
    role,
    isRoleStep,
    handleStatus,
    isCheckingHandle,
    isCreatingPage,
    submitError,
    onHandleSubmit,
    onRoleSubmit,
    onRoleChange: setRole,
    onSkip: () => void createPageWithRole(null),
  };
}

export type CreatePageFlowState = ReturnType<typeof useCreatePageFlow>;
