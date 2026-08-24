import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";

type FooterLink =
  | {
      type: "internal";
      href: Route;
      label: string;
    }
  | {
      type: "external";
      href: string;
      label: string;
      target?: "_blank";
    };

export const footerLinks = [
  { type: "internal", href: "/", label: "Home" },
  { type: "internal", href: "/log-in", label: "Login" },
  {
    type: "external",
    href: "https://discord.gg/U4NNF9hMms",
    label: "Community",
    target: "_blank",
  },
  { type: "internal", href: "/pricing", label: "Pricing" },
  { type: "internal", href: "/privacy", label: "Privacy" },
  { type: "internal", href: "/terms", label: "Terms" },
  {
    type: "external",
    href: "mailto:support@grabbin.me",
    label: "Contact",
  },
] as const satisfies readonly FooterLink[];

export default function Footer() {
  const appTitle = env.NEXT_PUBLIC_APP_TITLE || "Grabbin";

  return (
    <footer className="relative overflow-hidden bg-background px-5">
      <div className="relative mx-auto flex min-h-[36vh] w-full max-w-4xl flex-col justify-between gap-8 px-4 py-24 text-center items-center text-brand-gray">
        <div className="flex flex-col gap-6 items-center justify-center">
          <aside className="flex items-center gap-2">
            <div className="size-16 rounded-full">
              <Image
                src={"/icon.svg"}
                alt={appTitle}
                width={120}
                height={120}
                className="rounded-[inherit] size-full"
              />
            </div>
            <h3 className="font-semibold text-3xl text-primary">{appTitle}</h3>
          </aside>
          <div className="flex flex-col items-center font-medium gap-1 text-lg">
            <p>Designed for everyone</p>
            <p>
              Built by{" "}
              <a
                href={"https://x.com/kinwooky"}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                wooky
              </a>
            </p>
          </div>
        </div>

        <a
          href="https://ko-fi.com/I3Z525CTG8"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-40 items-center justify-center rounded-[7px] bg-[#72a4f2] px-3 py-0.5 my-6 text-sm font-bold leading-9 text-white transition-opacity hover:opacity-85"
        >
          <img
            src="https://storage.ko-fi.com/cdn/cup-border.png"
            alt="ko-fi cup"
            className="mr-1.5 h-[15px] w-[22px]"
          />
          Support me on Ko-fi
        </a>

        <nav aria-label="Footer">
          <ul className="flex flex-col items-center gap-5 text-lg font-medium sm:flex-row">
            {footerLinks.map((route) => (
              <li key={route.label}>
                <Link
                  href={route.href}
                  className="transition-colors hover:text-foreground/70"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
