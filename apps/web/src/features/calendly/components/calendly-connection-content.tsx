"use client";

import { calendlyConnectionErrorCodeSchema } from "@grabbin/api";
import { providerIconUrl } from "@grabbin/page-link";
import { Button, buttonVariants } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { useEffect, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import * as v from "valibot";
import { getSignInHref } from "@/lib/auth-redirect";
import { getErrorMessage } from "@/lib/error-message";
import {
	calendlyConnectionErrorFallback,
	calendlyConnectionErrorMessages,
} from "../constants/connection-errors";
import { useDisconnectCalendlyMutation } from "../mutations/disconnect";
import {
	CalendlyConnectionError,
	useCalendlyConnectionQuery,
} from "../queries/connection";
import CalendlyConnectButton from "./calendly-connect-button";

const signInHref = getSignInHref();

function getDisconnectingLabel(isPending: boolean) {
	if (!isPending) return undefined;
	return "Disconnecting";
}

export default function CalendlyConnectionContent({
	isPro,
}: {
	isPro: boolean;
}) {
	const [connectionError, setConnectionError] = useState("");
	const connectionQuery = useCalendlyConnectionQuery();
	const connected = connectionQuery.data?.connected ?? false;
	const disconnectMutation = useDisconnectCalendlyMutation();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("calendly") === "error") {
			const errorCode = v.safeParse(
				calendlyConnectionErrorCodeSchema,
				params.get("calendly_error"),
			);
			if (!errorCode.success) {
				setConnectionError(calendlyConnectionErrorFallback);
				return;
			}
			setConnectionError(calendlyConnectionErrorMessages[errorCode.output]);
		}
	}, []);

	const signInRequired =
		connectionQuery.error instanceof CalendlyConnectionError &&
		connectionQuery.error.status === 401;

	const renderConnectionStatus = () => {
		if (connectionQuery.isPending) {
			return (
				<div className="flex h-11 items-center gap-3 rounded-lg border border-border px-3">
					<Skeleton aria-hidden="true" className="size-6 rounded-md" />
					<Skeleton aria-hidden="true" className="h-4 w-24" />
				</div>
			);
		}

		if (connectionQuery.isError) {
			const errorMessage = (
				<p role="alert" className="text-destructive text-sm">
					{getErrorMessage(
						connectionQuery.error,
						"Could not check your Calendly connection.",
					)}
				</p>
			);

			if (signInRequired) {
				return (
					<div className="flex flex-col items-start gap-2">
						{errorMessage}
						<a
							href={signInHref}
							className="text-sm underline underline-offset-2"
						>
							Sign in
						</a>
					</div>
				);
			}

			return (
				<div className="flex flex-col items-start gap-2">
					{errorMessage}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void connectionQuery.refetch()}
					>
						Try again
					</Button>
				</div>
			);
		}

		if (connected) {
			return (
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
							src={providerIconUrl("calendly")}
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
						aria-busy={disconnectMutation.isPending}
						aria-label={getDisconnectingLabel(disconnectMutation.isPending)}
						className="relative"
						onClick={() =>
							disconnectMutation.mutate(undefined, {
								onSuccess: () => setConnectionError(""),
							})
						}
					>
						<span
							data-pending={disconnectMutation.isPending}
							className="data-[pending=true]:opacity-0"
						>
							Disconnect
						</span>
						{disconnectMutation.isPending && (
							<Loading aria-hidden="true" className="absolute size-4" />
						)}
					</Button>
				</div>
			);
		}

		return (
			<div className="flex min-w-0 items-center justify-between gap-3">
				<CalendlyConnectButton isPro={isPro} />
			</div>
		);
	};

	return (
		<div className="flex min-w-0 flex-col gap-2">
			{renderConnectionStatus()}
			{connectionError && (
				<p role="alert" className="text-destructive text-xs">
					{connectionError}
				</p>
			)}
			{disconnectMutation.isError && (
				<p role="alert" className="text-destructive text-xs">
					{getErrorMessage(
						disconnectMutation.error,
						"Could not disconnect Calendly.",
					)}
				</p>
			)}
		</div>
	);
}

export { CalendlyConnectionContent };
