"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

function getHandle(pathname: string) {
  try {
    return decodeURIComponent(pathname.split("/")[1] ?? "");
  } catch {
    return pathname.split("/")[1] ?? "";
  }
}

export default function NotFound() {
  const pathname = usePathname();
  const handle = getHandle(pathname);
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "grabbin.me";

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16 font-brand">
      <Empty>
        <EmptyHeader className="gap-0">
          <EmptyTitle className="font-brand text-[96px] leading-tight font-bold">
            404
          </EmptyTitle>
          <EmptyDescription className="max-w-sm font-medium tracking-tight text-gray-bright">
            Maybe this is your lucky break.
            <br />
            No one has claimed this handle yet. Grab it now!
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="my-4 max-w-2xs gap-2">
          <div className="flex h-12 w-full items-center justify-center rounded-lg bg-secondary/80 px-18 text-base">
            <span className="text-muted-foreground/80">{domain}/</span>
            <span>{handle}</span>
          </div>
          <div className="flex w-full flex-col">
            <Button
              render={<Link href="/log-in" />}
              size="lg"
              nativeButton={false}
              variant="secondary"
              className="h-12 max-w-md rounded-lg text-base"
            >
              Grab it!
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
          </div>
        </EmptyContent>
      </Empty>
    </section>
  );
}
