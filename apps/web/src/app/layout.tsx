import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "../index.css";
import { cn } from "@grabbin/ui/lib/utils";
import SimpleAnalyticsRouteTracker from "@/components/analytics/simple-analytics-route-tracker";
import Providers from "@/components/provider/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	metadataBase: new URL("https://grabbin.me"),
	title: "A visual personal website for your work | Grabbin",
	description:
		"Create a personal website that brings your story, work, and content together. Build a polished page with flexible widgets and make your link in bio feel like your own corner of the web.",
	openGraph: {
		title: "A visual personal website for your work | Grabbin",
		description:
			"Create a personal website that brings your story, work, and content together. Build a polished page with flexible widgets and make your link in bio feel like your own corner of the web.",
	},
	icons: {
		icon: "/favicon.svg",
		apple: "/apple-icon.png",
	},
};

const jsonLd = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Organization",
			"@id": "https://grabbin.me/#organization",
			name: "Grabbin",
			url: "https://grabbin.me",
			logo: "https://grabbin.me/favicon.svg",
		},
		{
			"@type": "WebSite",
			"@id": "https://grabbin.me/#website",
			url: "https://grabbin.me",
			name: "Grabbin",
			description:
				"Create a personal website that brings your story, work, and content together. Build a polished page with flexible widgets and make your link in bio feel like your own corner of the web.",
			publisher: { "@id": "https://grabbin.me/#organization" },
		},
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn("font-sans", inter.variable)}
		>
			<body className="relative antialiased">
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
					}}
				/>
				<Script
					src="https://stats.wooky.cfd/glance.js"
					strategy="afterInteractive"
					data-site="site_73xx7p5nm623czow"
				/>
				<Providers>
					<SimpleAnalyticsRouteTracker />
					{children}
				</Providers>
			</body>
		</html>
	);
}
