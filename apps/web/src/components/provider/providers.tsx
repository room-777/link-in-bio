"use client";

import { Toaster } from "@grabbin/ui/components/sonner";
import { Toasts } from "@grabbin/ui/components/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { getQueryClient } from "../../lib/query-client";
import { ThemeProvider } from "../layout/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryStreamedHydration>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
					<Toaster position="bottom-center" />
					<Toasts position="top-center" />
				</ThemeProvider>
			</ReactQueryStreamedHydration>
			{process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
		</QueryClientProvider>
	);
}
