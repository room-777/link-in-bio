"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="flex flex-1 items-center justify-center px-6 py-16 font-brand"
    >
      <Empty>
        <EmptyHeader className="gap-3">
          <EmptyTitle className="font-brand text-2xl leading-tight font-semibold">
            Well... this wasn&apos;t supposed to happen.
          </EmptyTitle>
          <EmptyDescription className="max-w-sm text-sm text-gray-bright">
            {process.env.NODE_ENV === "development" && error.message
              ? error.message
              : "Please try again."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-8 max-w-2xs gap-1">
          <Button
            type="button"
            onClick={reset}
            size="lg"
            variant="secondary"
            className="h-12 w-full rounded-lg text-base"
          >
            Try again
          </Button>
          <Button
            render={<Link href="/" />}
            size="sm"
            nativeButton={false}
            variant="link"
            className="rounded-lg text-gray-bright"
          >
            or back to home
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  );
}
