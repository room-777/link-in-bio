"use client";

import { createPageSchema } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import { Field, FieldError, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { CloseCircle } from "reicon-react/icons/CloseCircle";
import { Loader } from "reicon-react/icons/Loader";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

export default function CreatePageForm() {
	const router = useRouter();
	const [handle, setHandle] = useState("");
	const [availability, setAvailability] = useState<Availability>("idle");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!handle.trim()) {
			setAvailability("idle");
			return;
		}

		let cancelled = false;
		setAvailability("checking");
		const timeout = window.setTimeout(async () => {
			try {
				const response = await apiClient.pages.check.$get({
					query: { handle },
				});
				if (cancelled) return;
				if (!response.ok) {
					setAvailability("invalid");
					return;
				}
				const result = await response.json();
				setAvailability(result.available ? "available" : "taken");
			} catch {
				if (!cancelled) setAvailability("invalid");
			}
		}, 250);

		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [handle]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(createPageSchema, { handle });
		if (!parsed.success) {
			setError("Please choose a handle.");
			return;
		}
		if (availability !== "available") {
			setError(
				availability === "checking"
					? "Please wait until your handle is checked."
					: "Please choose an available handle.",
			);
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			const response = await apiClient.pages.$post({
				json: parsed.output,
			});
			if (!response.ok) {
				setIsSubmitting(false);
				setError(await getApiErrorMessage(response));
				return;
			}

			const body = await response.json();
			if (!("page" in body)) {
				setIsSubmitting(false);
				setError("Please try again.");
				return;
			}
			const { page } = body;
			router.replace(`/${page.handle}`);
		} catch {
			setIsSubmitting(false);
			setError("Please try again.");
		}
	};

	const statusIcon =
		availability === "checking" ? (
			<Loader className="size-full animate-spin" aria-hidden="true" />
		) : availability === "available" ? (
			<CheckCircle
				weight="Filled"
				className="size-full text-green-500"
				aria-hidden="true"
			/>
		) : availability === "taken" || availability === "invalid" ? (
			<CloseCircle
				weight="Filled"
				className="size-full text-destructive"
				aria-hidden="true"
			/>
		) : null;

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
			<header className="flex w-full flex-col gap-0.5">
				<h1 className="font-medium text-xl">First, Claim your handle</h1>
				<p className="text-wrap text-muted-foreground text-sm">
					Choose a unique handle for your public page.
				</p>
			</header>

			<form
				noValidate
				onSubmit={handleSubmit}
				className="w-full min-[90rem]:max-w-sm"
			>
				<FieldGroup>
					<Field data-invalid={!!error}>
						<label htmlFor="handle" className="sr-only">
							Handle
						</label>
						<InputGroup className="h-11 max-w-full rounded-lg bg-secondary text-base">
							<InputGroupInput
								id="handle"
								name="handle"
								aria-describedby="handle-status-message handle-error"
								aria-invalid={!!error}
								autoComplete="off"
								className="pl-0.5! text-base! placeholder:font-normal placeholder:text-base! placeholder:text-muted-foreground/50"
								onChange={(event) => {
									setHandle(event.target.value);
									setError("");
								}}
								placeholder="your-handle"
								value={handle}
							/>
							<InputGroupAddon align="inline-start" className="pl-4 text-base!">
								{env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me"}/
							</InputGroupAddon>
							{statusIcon && (
								<InputGroupAddon
									align="inline-end"
									data-state={availability}
									id="handle-status-icon"
									aria-label={`Handle ${availability}`}
									className="size-9"
								>
									{statusIcon}
								</InputGroupAddon>
							)}
						</InputGroup>
						<div id="handle-error" className="min-h-5" aria-live="polite">
							<FieldError className="text-xs">{error}</FieldError>
						</div>
					</Field>
				</FieldGroup>

				<Button
					type="submit"
					variant={"default"}
					disabled={isSubmitting}
					className="mt-2 h-11 w-full"
				>
					{isSubmitting ? <Loading /> : "Grab it"}
				</Button>
			</form>
		</main>
	);
}
