import Image from "next/image";
import CTAButton from "@/components/landing/cta-button";
import TryDemoButton from "@/components/landing/demo-button";

export default function HeroSection() {
  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-16 max-w-4xl mx-auto">
      <div className="flex flex-col justify-between items-center gap-12 w-full">
        <div className="flex flex-col items-center justify-center gap-12">
          <header className="flex flex-col gap-8 items-center">
            <div className="size-20">
              <Image
                src="/favicon.svg"
                alt="Grabbin"
                width={80}
                height={80}
                className="size-full object-cover"
              />
            </div>
            <h1 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
              <span>Bring everything.</span>
              <span>Be yourself.</span>
            </h1>
            <p className="text-lg font-medium text-center text-balance md:text-xl leading-tight">
              A cleaner, more beautiful link in bio.
              <span className="block text-gray-bright leading-tight">
                Your links, content, and favorite places — all in one link in
                bio.
              </span>
            </p>
          </header>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 w-3xs md:w-xs">
          <CTAButton href="/log-in" title="Join for free" />
          <TryDemoButton />
        </div>
      </div>
    </section>
  );
}
