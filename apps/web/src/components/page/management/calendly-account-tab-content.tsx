"use client";

import { calendlyConnectionStatusSchema } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { Button, buttonVariants } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import * as v from "valibot";
import CalendlyConnectButton from "@/components/page/calendly-connect-button";
import { getSignInHref } from "@/lib/auth-redirect";
import { calendlyConnectionQueryKey } from "@/lib/calendly";

const apiUrl = env.NEXT_PUBLIC_SERVER_URL;
const signInHref = getSignInHref();
class CalendlyConnectionError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
	}
}

const connectionErrorMessages: Record<string, string> = {
	authorization_denied:
		"Calendly authorization was cancelled. Approve access and try again.",
	missing_code:
		"Calendly did not return an authorization code. Try connecting again.",
	missing_cookie:
		"Your browser did not return the temporary connection cookie. Restart the connection from this page.",
	malformed_cookie:
		"The temporary connection data was incomplete. Restart the connection from this page.",
	state_mismatch:
		"The connection state did not match. Restart the connection from this page.",
	user_mismatch:
		"The signed-in Grabbin account changed. Sign in to the same account and try again.",
	signature_mismatch:
		"The connection could not be verified. Restart the connection from this page.",
	pro_required: "Upgrade to Pro to connect your Calendly account.",
	token_exchange:
		"Calendly approved the connection, but Grabbin could not exchange the access code.",
	save_connection:
		"Calendly connected, but Grabbin could not save the connection.",
};

export function CalendlyAccountTabContent({ isPro }: { isPro: boolean }) {
	const queryClient = useQueryClient();
	const [connectionError, setConnectionError] = useState("");
	const connectionQuery = useQuery({
		queryKey: calendlyConnectionQueryKey,
		retry: false,
		queryFn: async ({ signal }) => {
			const response = await fetch(`${apiUrl}/auth/calendly`, {
				credentials: "include",
				signal,
			});
			if (response.status === 401) {
				throw new CalendlyConnectionError(
					"Sign in to connect your Calendly account.",
					401,
				);
			}
			if (!response.ok)
				throw new CalendlyConnectionError(
					"Could not check your Calendly connection.",
				);
			const result = v.safeParse(
				calendlyConnectionStatusSchema,
				await response.json(),
			);
			if (!result.success)
				throw new CalendlyConnectionError(
					"Could not check your Calendly connection.",
				);
			return result.output;
		},
	});
	const connected = connectionQuery.data?.connected ?? false;
	const disconnectMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch(`${apiUrl}/auth/calendly/disconnect`, {
				method: "POST",
				credentials: "include",
			});
			if (!response.ok) throw new Error("Could not disconnect Calendly.");
		},
		onSuccess: () => {
			queryClient.setQueryData(calendlyConnectionQueryKey, {
				connected: false,
			});
			setConnectionError("");
		},
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("calendly") === "error") {
			setConnectionError(
				connectionErrorMessages[params.get("calendly_error") ?? ""] ??
					"Could not connect Calendly. Please try again.",
			);
		}
	}, []);

	const signInRequired =
		connectionQuery.error instanceof CalendlyConnectionError &&
		connectionQuery.error.status === 401;

	return (
		<div className="flex min-w-0 flex-col gap-2">
			{connectionQuery.isPending ? (
				<div className="flex h-11 items-center gap-3 rounded-lg border border-border px-3">
					<Skeleton aria-hidden="true" className="size-6 rounded-md" />
					<Skeleton aria-hidden="true" className="h-4 w-24" />
				</div>
			) : connectionQuery.isError ? (
				<div className="flex flex-col items-start gap-2">
					<p role="alert" className="text-destructive text-sm">
						{connectionQuery.error instanceof Error
							? connectionQuery.error.message
							: "Could not check your Calendly connection."}
					</p>
					{signInRequired ? (
						<a
							href={signInHref}
							className="text-sm underline underline-offset-2"
						>
							Sign in
						</a>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void connectionQuery.refetch()}
						>
							Try again
						</Button>
					)}
				</div>
			) : connected ? (
				<div className="flex min-w-0 items-center justify-between gap-3">
					<span
						role="status"
						className={buttonVariants({
							variant: "outline",
							size: "lg",
							className:
								"pointer-events-none cursor-default border-border! opacity-100",
						})}
					>
						<img
							src="/api/provider-icons/calendly.svg?v=3"
							alt=""
							aria-hidden="true"
							className="size-4 object-contain"
						/>
						Connected
						<CheckCircle
							aria-hidden="true"
							weight="Filled"
							className="size-4 text-brand-green"
						/>
					</span>
					<Button
						type="button"
						variant="outline"
						size="lg"
						disabled={disconnectMutation.isPending}
						aria-label={
							disconnectMutation.isPending ? "Disconnecting" : undefined
						}
						className="relative"
						onClick={() => disconnectMutation.mutate()}
					>
						<span className={disconnectMutation.isPending ? "opacity-0" : ""}>
							Disconnect
						</span>
						{disconnectMutation.isPending ? (
							<Loading aria-hidden="true" className="absolute size-4" />
						) : null}
					</Button>
				</div>
			) : (
				<div className="flex min-w-0 items-center justify-between gap-3">
					<CalendlyConnectButton isPro={isPro} />
				</div>
			)}
			{connectionError ? (
				<p role="alert" className="text-destructive text-xs">
					{connectionError}
				</p>
			) : null}
			{disconnectMutation.isError ? (
				<p role="alert" className="text-destructive text-xs">
					{disconnectMutation.error instanceof Error
						? disconnectMutation.error.message
						: "Could not disconnect Calendly."}
				</p>
			) : null}
		</div>
	);
}
