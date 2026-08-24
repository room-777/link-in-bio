"use client";

import type { MyPageResponse, SessionResponse } from "@grabbin/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CTAButton({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (href !== "/log-in") return;

    event.preventDefault();
    if (isNavigating) return;

    setIsNavigating(true);
    try {
      const sessionResponse = await fetch("/api/auth/get-session", {
        cache: "no-store",
        credentials: "include",
      });
      if (!sessionResponse.ok) {
        router.push(href as never);
        return;
      }

      const session = (await sessionResponse.json()) as SessionResponse;
      if (!session?.user) {
        router.push(href as never);
        return;
      }

      const myPageResponse = await fetch("/api/pages/me", {
        cache: "no-store",
        credentials: "include",
      });
      if (!myPageResponse.ok) {
        router.push(href as never);
        return;
      }

      const myPage = (await myPageResponse.json()) as MyPageResponse;
      const destination = myPage.page?.handle
        ? `/${encodeURIComponent(myPage.page.handle)}`
        : "/new";
      router.replace(destination as never);
    } catch {
      router.push(href as never);
    } finally {
      setIsNavigating(false);
    }
  }

  return (
    <Button
      size="lg"
      variant="brand"
      className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14"
      nativeButton={false}
      render={
        <Link
          href={href as never}
          prefetch={false}
          onClick={(event) => void handleClick(event)}
          aria-busy={isNavigating}
        >
          {title}
        </Link>
      }
    />
  );
}
