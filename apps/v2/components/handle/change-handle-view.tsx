"use client";

import type { HandleAvailabilityResponse, PageResponse } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeftIcon } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Loader, XCircle } from "reicon-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { checkPageHandle, updatePage } from "@/lib/client/page-api";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";

type ChangeHandleViewProps = {
  page: PageResponse;
  handle: string;
  siteOrigin: string;
  readOnly: boolean;
  busy: boolean;
  onHandleChange: (value: string) => void;
  onBack: () => void;
  onSaved: (page: PageResponse) => void;
  onBusy: (busy: boolean) => void;
};

export function ChangeHandleView({
  page,
  handle,
  siteOrigin,
  readOnly,
  busy,
  onHandleChange,
  onBack,
  onSaved,
  onBusy,
}: ChangeHandleViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleMutation = useMutation({
    mutationFn: (nextHandle: string) =>
      updatePage(page.handle, { handle: nextHandle }),
    throwOnError: false,
  });
  const [availability, setAvailability] =
    useState<HandleAvailabilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = getHandleAvailabilityStatus(handle, availability, checking);
  const domain = useMemo(() => {
    try {
      return new URL(siteOrigin).host;
    } catch {
      return siteOrigin;
    }
  }, [siteOrigin]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (handle.trim().toLowerCase() === page.handle || !handle.trim()) {
      setAvailability(null);
      setChecking(false);
      return;
    }
    let current = true;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const result = await checkPageHandle(handle);
        if (current) setAvailability(result);
      } catch {
        if (current) setError("Could not check this handle.");
      } finally {
        if (current) setChecking(false);
      }
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [handle, page.handle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || readOnly || !status.canCreatePage) return;
    onBusy(true);
    setError(null);
    try {
      const result = await handleMutation.mutateAsync(handle);
      onSaved(result.page);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not change this handle.",
      );
    } finally {
      onBusy(false);
    }
  }

  const StatusIcon = checking
    ? Loader
    : status.canCreatePage
      ? CheckCircle
      : availability?.available === false
        ? XCircle
        : null;

  return (
    <form
      className="flex h-full flex-col justify-between gap-3 p-2"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back"
          className="rounded-md"
        >
          <ChevronLeftIcon className="size-5 stroke-2" />
        </Button>
        <h3 className="text-base font-medium">Change handle</h3>
      </div>
      <div className="flex flex-col gap-2">
        <InputGroup className="h-11 rounded-lg">
          <InputGroupInput
            ref={inputRef}
            value={handle}
            onChange={(event) => {
              onHandleChange(event.target.value);
              setAvailability(null);
              setError(null);
            }}
            disabled={busy || readOnly}
            placeholder="your-handle"
            autoComplete="off"
            aria-invalid={Boolean(status.error || error)}
            className="pl-0.5! text-base! placeholder:font-normal placeholder:text-base! placeholder:text-muted-foreground/50"
          />
          <InputGroupAddon
            align="inline-start"
            className="pl-4 text-base! font-normal"
          >
            {domain}/
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className={`size-10 pr-1 ${status.canCreatePage ? "text-green-500" : availability?.available === false ? "text-destructive" : ""}`}
          >
            {StatusIcon ? (
              <StatusIcon
                weight={checking ? "Outline" : "Filled"}
                className={`size-full ${checking ? "animate-spin" : ""}`}
              />
            ) : null}
          </InputGroupAddon>
        </InputGroup>
        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={
            busy ||
            checking ||
            !status.canCreatePage ||
            handle.trim().toLowerCase() === page.handle
          }
          className="h-12 rounded-lg text-base"
        >
          {busy ? <Loader className="animate-spin" /> : "Update handle"}
        </Button>
      </div>
    </form>
  );
}
