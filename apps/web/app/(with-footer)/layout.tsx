import type { ReactNode } from "react";
import Footer from "@/components/layout/footer";

export default function WithFooterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <div className="px-5">
        <Footer />
      </div>
    </>
  );
}
