"use client";

import { createPageSchema } from "@grabbin/api";
import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";
import { DialogDescription, DialogTitle } from "@grabbin/ui/components/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { Marquee } from "@grabbin/ui/components/marquee";
import { cn } from "@grabbin/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { CloseCircle } from "reicon-react/icons/CloseCircle";
import { Loader } from "reicon-react/icons/Loader";
import * as v from "valibot";

import { apiClient, getApiErrorMessage } from "@/lib/api-client";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

const exampleHandles = [
	"softsignal",
	"quietorbit",
	"morrowclub",
	"oddhours",
	"tinyatlas",
	"slowframe",
	"lucidform",
	"stillhuman",
	"aftermoss",
	"daylightdept",
];

type PageHandleFormProps = {
	initialHandle?: string;
	title: string;
	description: string;
	submitLabel: string;
	variant?: Parameters<typeof Button>[0]["variant"];
	className?: string;
	compact?: boolean;
	onSubmit: (handle: string) => Promise<void>;
};

export function PageHandleForm({
	initialHandle = "",
	title,
	description,
	submitLabel,
	variant,
	className,
	compact = false,
	onSubmit,
}: PageHandleFormProps) {
	const normalizedInitialHandle = initialHandle.trim();
	const [handle, setHandle] = useState(normalizedInitialHandle);
	const [debouncedHandle, setDebouncedHandle] = useState(
		normalizedInitialHandle,
	);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const normalizedHandle = handle.trim();
		if (!normalizedHandle) {
			setDebouncedHandle("");
			return;
		}

		const timeout = window.setTimeout(
			() => setDebouncedHandle(normalizedHandle),
			250,
		);
		return () => window.clearTimeout(timeout);
	}, [handle]);

	const {
		data: handleCheck,
		isError: isHandleCheckError,
		isFetching: isHandleCheckFetching,
		isPending: isHandleCheckPending,
	} = useQuery({
		queryKey: ["page-handle-check", debouncedHandle],
		queryFn: async ({ signal }) => {
			const response = await apiClient.pages.check.$get(
				{ query: { handle: debouncedHandle } },
				{ init: { signal } },
			);
			if (!response.ok) {
				throw new Error(await getApiErrorMessage(response));
			}
			return response.json();
		},
		enabled: !!debouncedHandle,
	});

	const currentHandle = handle.trim();
	const hasHandleChange =
		currentHandle.toLowerCase() !== normalizedInitialHandle.toLowerCase();
	const isInitialHandle = Boolean(normalizedInitialHandle) && !hasHandleChange;
	const availability: Availability = !currentHandle
		? "idle"
		: isInitialHandle
			? "available"
			: currentHandle !== debouncedHandle ||
					isHandleCheckPending ||
					isHandleCheckFetching
				? "checking"
				: isHandleCheckError
					? "invalid"
					: handleCheck?.reason === "invalid"
						? "invalid"
						: handleCheck?.available
							? "available"
							: "taken";

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(createPageSchema, { handle });
		if (!parsed.success) {
			setError("Please choose a valid handle.");
			return;
		}
		if (availability !== "available") {
			setError(
				availability === "checking"
					? "Please wait until your handle is checked."
					: availability === "invalid"
						? "Please choose a valid handle."
						: "Please choose an available handle.",
			);
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			await onSubmit(parsed.output.handle);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Please try again.");
		} finally {
			setIsSubmitting(false);
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
	const Title = compact ? DialogTitle : "h1";
	const Description = compact ? DialogDescription : "p";

	return (
		<div
			className={
				compact ? "flex h-full w-full flex-col" : "flex w-full flex-col gap-8"
			}
		>
			<header className="flex w-full flex-col gap-0.5">
				<Title
					className={compact ? "leading-normal" : "font-semibold text-2xl"}
				>
					{title}
				</Title>
				<Description
					className={
						compact
							? "text-balance md:text-pretty"
							: "text-wrap text-base text-primary/80"
					}
				>
					{description}
				</Description>
			</header>

			<Marquee
				id="marquee"
				aria-hidden="true"
				className={
					compact
						? "my-auto w-full min-[90rem]:max-w-sm"
						: "my-6 w-full min-[90rem]:max-w-sm"
				}
			>
				{exampleHandles.map((exampleHandle) => (
					<div
						key={exampleHandle}
						className="smooth-shadow-xs mr-3 w-fit rounded-lg p-2 px-5 font-medium text-lg outline outline-black/10 -outline-offset-1"
					>
						@{exampleHandle}
					</div>
				))}
			</Marquee>

			<form
				noValidate
				onSubmit={handleSubmit}
				className={
					compact
						? "w-full min-[90rem]:max-w-sm"
						: "w-full min-[90rem]:max-w-sm"
				}
			>
				<FieldGroup>
					<Field data-invalid={!!error}>
						<FieldLabel htmlFor="handle" className="sr-only">
							Handle
						</FieldLabel>
						<div className="flex items-center gap-2">
							<div className="smooth-shadow-xs flex aspect-square size-11 items-center justify-center rounded-lg border">
								<Globe className="-rotate-z-12 stroke-[2] text-foreground" />
							</div>
							<InputGroup
								className={cn(
									"h-11 max-w-full grow rounded-lg bg-secondary text-base",
									compact && "ring-inset",
								)}
							>
								<InputGroupInput
									id="handle"
									name="handle"
									aria-describedby="handle-status-icon"
									aria-errormessage="handle-error"
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
								<InputGroupAddon
									align="inline-start"
									className="pl-4 text-base!"
								>
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
						</div>
						<FieldError
							id="handle-error"
							className="text-xs"
							aria-live="polite"
						>
							{error}
						</FieldError>
					</Field>
				</FieldGroup>

				<Button
					type="submit"
					size="xl"
					variant={variant}
					disabled={isSubmitting || (compact && !hasHandleChange)}
					className={`smooth-shadow-xs mt-2 h-12 w-full text-base${className ? ` ${className}` : ""}`}
				>
					{isSubmitting ? <Loading /> : submitLabel}
				</Button>
			</form>
		</div>
	);
}

export default function CreatePageForm() {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [isExiting, setIsExiting] = useState(false);
	const [redirectPath, setRedirectPath] = useState<string | null>(null);
	const entryTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 0.55, bounce: 0.1 };
	const exitTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.42, ease: [0.23, 1, 0.32, 1] as const };

	return (
		<div className="min-w-0">
			<AnimatePresence
				mode="wait"
				onExitComplete={() => {
					if (redirectPath) router.replace(redirectPath);
				}}
			>
				{!isExiting && (
					<motion.main
						key="create-page"
						initial={reduceMotion ? false : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -16, transition: exitTransition }}
						transition={entryTransition}
						className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-6 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:px-16 min-[90rem]:pt-16"
					>
						<PageHandleForm
							title="Choose your handle"
							description="Pick a unique handle for your page."
							submitLabel="Grab it"
							onSubmit={async (handle) => {
								const response = await apiClient.pages.$post({
									json: { handle },
								});
								if (!response.ok) {
									throw new Error(await getApiErrorMessage(response));
								}

								const body = await response.json();
								if (!("page" in body) || !body.page) {
									throw new Error("Please try again.");
								}
								setRedirectPath(`/${body.page.handle}`);
								setIsExiting(true);
							}}
						/>
					</motion.main>
				)}
			</AnimatePresence>
		</div>
	);
}
