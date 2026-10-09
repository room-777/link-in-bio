"use client";

import { Toasts } from "@grabbin/ui/components/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { OverlayProvider } from "overlay-kit";
import { getQueryClient } from "../../lib/query-client";
import { ThemeProvider } from "../layout/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				disableTransitionOnChange
			>
				<OverlayProvider>
					{children}
					<Toasts position="top-center" />
				</OverlayProvider>
			</ThemeProvider>
			{/*{process.env.NODE_ENV === "development" && <ReactQueryDevtools />}*/}
		</QueryClientProvider>
	);
}
