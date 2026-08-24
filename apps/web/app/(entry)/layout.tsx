import type { ReactNode } from "react";

export default function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative mx-auto flex h-lvh w-full grow items-center justify-between px-5 py-6">
      <aside className="flex basis-0 flex-1 justify-center">
        <section className="relative flex w-full max-w-sm flex-col gap-10">
          {children}
        </section>
      </aside>
      <aside className="hidden h-full basis-0 flex-1 xl:block">
        {/* biome-ignore lint/performance/noImgElement: The static entry artwork is intentionally loaded as an external asset. */}
        <img
          src="https://cdn.grabbin.me/assets/features/5.jpg"
          alt=""
          className="h-full w-full rounded-[2rem] object-cover"
        />
      </aside>
    </main>
  );
}
