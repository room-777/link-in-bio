import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Providers } from "@/lib/providers";
import { SimpleAnalyticsTracker } from "@/lib/simple-analytics-tracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://grabbin.me"),
  title: "Grabbin — A Link in Bio",
  description: "A cleaner, more beautiful link in bio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col">
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
          data-auto-collect="false"
        />
        <Providers>
          <SimpleAnalyticsTracker />
          <div className="flex min-h-svh flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
