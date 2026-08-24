"use client";

import type { FormEvent } from "react";
import { Loader } from "reicon-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreatePageFlowState } from "@/hooks/use-create-page-flow";
import { cn } from "@/lib/utils";

export const ROLE_OPTIONS = [
  { value: "engineer", label: "Engineer" },
  { value: "designer", label: "Designer" },
  { value: "writer", label: "Writer" },
  { value: "developer", label: "Developer" },
  { value: "product-manager", label: "Product Manager" },
  { value: "founder", label: "Founder" },
  { value: "student", label: "Student" },
  { value: "creator", label: "Creator" },
  { value: "photographer", label: "Photographer" },
] as const;

export function CreateRoleStep({ flow }: { flow: CreatePageFlowState }) {
  const {
    role,
    isCreatingPage,
    submitError,
    onRoleSubmit,
    onRoleChange,
    onSkip,
  } = flow;

  return (
    <form
      className="t-page flex flex-col gap-8"
      data-page-id="2"
      onSubmit={(event: FormEvent<HTMLFormElement>) => onRoleSubmit(event)}
    >
      <div className="flex flex-col items-start gap-0.5">
        <h1 className="text-xl font-medium">What do you do?</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Choose a role to personalize your page.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Roles</legend>
          {ROLE_OPTIONS.map((option) => {
            const isSelected = role === option.value;
            return (
              <button
                type="button"
                key={option.value}
                aria-pressed={isSelected}
                onClick={() => onRoleChange(option.value)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-3 py-4 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none",
                    isSelected && "bg-brand text-white",
                  )}
                >
                  {option.label}
                </Badge>
              </button>
            );
          })}
        </fieldset>
        {submitError ? (
          <p className="text-center text-xs text-destructive">{submitError}</p>
        ) : null}
        <div className="flex flex-row-reverse gap-1">
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="h-12 flex-2 rounded-lg text-base font-medium"
            disabled={isCreatingPage}
          >
            {isCreatingPage ? <Loader className="animate-spin" /> : "Continue"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-12 flex-1 rounded-lg text-base text-muted-foreground"
            disabled={isCreatingPage}
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </form>
  );
}
