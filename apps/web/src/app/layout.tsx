import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "../index.css";
import { cn } from "@grabbin/ui/lib/utils";
import Providers from "@/components/provider/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://grabbin.me"),
	title: "grabbin",
	description:
		"Bring your links, photos, social profiles, and favorite places together on a page that feels like you.",
	openGraph: {
		title: "Your link in bio. Made to feel like you.",
		description:
			"Bring your links, photos, social profiles, and favorite places together on a page that feels like you.",
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
			logo: "https://grabbin.me/icon.svg",
		},
		{
			"@type": "WebSite",
			"@id": "https://grabbin.me/#website",
			url: "https://grabbin.me",
			name: "Grabbin",
			description:
				"Bring your links, photos, social profiles, and favorite places together on a page that feels like you.",
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
			<body
				className={`${geistSans.variable} ${geistMono.variable} relative antialiased`}
			>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
					}}
				/>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
