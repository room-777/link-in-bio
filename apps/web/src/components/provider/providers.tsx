"use client";

import { Toaster } from "@my-better-t-app/ui/components/sonner";
import { Toasts } from "@my-better-t-app/ui/components/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
				{children}
				<Toaster position="bottom-center" />
				<Toasts position="top-center" />
			</ThemeProvider>
			{process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
		</QueryClientProvider>
	);
}
