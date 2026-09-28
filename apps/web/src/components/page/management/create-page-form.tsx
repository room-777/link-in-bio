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
import { Check, ChevronLeft, Copy, Globe } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Activity, type FormEvent, useEffect, useState } from "react";
import Confetti from "react-confetti";
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
	buttonClassName?: string;
	titleClassName?: string;
	layoutClassName?: string;
	compact?: boolean;
	onSubmit: (handle: string) => Promise<void>;
};

export function PageHandleForm({
	initialHandle = "",
	title,
	description,
	submitLabel,
	variant,
	buttonClassName,
	titleClassName,
	layoutClassName,
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
			className={cn(
				compact
					? "flex h-full w-full flex-col gap-6"
					: "flex w-full flex-col gap-8",
				layoutClassName,
			)}
		>
			<header className="flex w-full flex-col gap-0.5">
				<Title
					className={cn(
						compact ? "leading-normal" : "font-semibold text-2xl",
						titleClassName,
					)}
				>
					{title}
				</Title>
				{description && (
					<Description
						className={
							compact
								? "text-balance md:text-pretty"
								: "text-wrap text-base text-primary/80"
						}
					>
						{description}
					</Description>
				)}
			</header>

			<Marquee
				id="marquee"
				aria-hidden="true"
				className={
					compact
						? "w-full min-[90rem]:max-w-sm"
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
					variant={variant ?? "brandBlack"}
					disabled={isSubmitting || (compact && !hasHandleChange)}
					className={cn("mt-2 h-12 w-full text-base", buttonClassName)}
				>
					{isSubmitting ? <Loading /> : submitLabel}
				</Button>
			</form>
		</div>
	);
}

export default function CreatePageForm({
	presentation = "page",
	onComplete,
	onBack,
}: {
	presentation?: "page" | "dialog";
	onComplete?: (handle: string) => void;
	onBack?: () => void;
}) {
	const router = useRouter();
	const isDialog = presentation === "dialog";
	const reduceMotion = useReducedMotion();
	const [activity, setActivity] = useState<"create" | "exiting" | "complete">(
		"create",
	);
	const [createdPage, setCreatedPage] = useState<{ handle: string } | null>(
		null,
	);
	const entryTransition = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, duration: 0.55, bounce: 0.1 };
	const exitTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.42, ease: [0.23, 1, 0.32, 1] as const };

	return (
		<div
			className={cn(
				"relative flex min-w-0",
				isDialog
					? "h-full min-h-0 w-full"
					: "min-h-svh items-center justify-center",
			)}
		>
			<Activity mode={activity === "complete" ? "hidden" : "visible"}>
				<motion.main
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={
						activity === "create"
							? { opacity: 1, y: 0 }
							: { opacity: 0, y: -16 }
					}
					transition={activity === "create" ? entryTransition : exitTransition}
					onAnimationComplete={() => {
						if (activity === "exiting") setActivity("complete");
					}}
					aria-hidden={activity !== "create"}
					inert={activity !== "create"}
					className={cn(
						isDialog
							? "flex h-full min-h-0 w-full flex-col gap-3 p-1"
							: "mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 p-6",
						activity === "complete" && "pointer-events-none absolute inset-0",
					)}
				>
					{isDialog && onBack && activity !== "complete" && (
						<Button
							variant="ghost"
							size="icon-lg"
							className="-ml-1 self-start rounded-full"
							aria-label="Back to manage pages"
							onClick={onBack}
						>
							<ChevronLeft
								aria-hidden="true"
								className="size-8"
								strokeWidth={2}
							/>
						</Button>
					)}
					<div className={isDialog ? "min-h-0 flex-1" : "min-[90rem]:max-w-sm"}>
						<PageHandleForm
							compact={isDialog}
							title="Choose a unique handle for your page"
							description=""
							submitLabel="Grab it"
							titleClassName="text-lg font-medium"
							buttonClassName="drop-shadow-md"
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
								setCreatedPage({ handle: body.page.handle });
								setActivity("exiting");
							}}
						/>
					</div>
				</motion.main>
			</Activity>
			<Activity mode={activity === "complete" ? "visible" : "hidden"}>
				{activity === "complete" && createdPage && (
					<>
						<Confetti
							numberOfPieces={240}
							recycle={false}
							style={{
								position: "fixed",
								inset: 0,
								zIndex: 50,
								pointerEvents: "none",
							}}
						/>
						<motion.main
							initial={reduceMotion ? false : { opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={entryTransition}
							className={cn(
								isDialog
									? "flex h-full min-h-0 w-full flex-col justify-center gap-6 p-1"
									: "mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 p-6",
							)}
						>
							<PageOnboardingComplete
								page={createdPage}
								onGoToProfile={() => {
									if (onComplete) onComplete(createdPage.handle);
									else
										router.replace(
											`/${encodeURIComponent(createdPage.handle)}`,
										);
								}}
							/>
						</motion.main>
					</>
				)}
			</Activity>
		</div>
	);
}

function PageOnboardingComplete({
	page,
	onGoToProfile,
	actionLabel = "Go to profile",
}: {
	page: { handle: string };
	onGoToProfile: () => void;
	actionLabel?: string;
}) {
	const [isShown, setIsShown] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const reduceMotion = useReducedMotion();
	const domain = env.NEXT_PUBLIC_PAGE_DOMAIN ?? "grabbin.me";

	useEffect(() => {
		setIsShown(true);
	}, []);

	useEffect(() => {
		if (!isCopied) return;
		const timeout = window.setTimeout(() => setIsCopied(false), 1800);
		return () => window.clearTimeout(timeout);
	}, [isCopied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(
				new URL(`/${page.handle}`, window.location.origin).toString(),
			);
			setIsCopied(true);
		} catch {
			setIsCopied(false);
		}
	};

	return (
		<section className="flex w-full max-w-sm flex-col gap-12">
			<header
				className={`t-stagger mb-4 flex w-full flex-col gap-0.5 ${isShown ? "is-shown" : ""}`}
			>
				<span
					className="t-success-check mb-4 self-start"
					data-state="in"
					aria-hidden="true"
				>
					<CheckCircle weight="Filled" className="size-12 text-brand-green" />
				</span>
				<h1 className="t-stagger-line t-stagger-line--1 font-semibold text-2xl">
					Looking good!
				</h1>
				<p className="t-stagger-line t-stagger-line--2 text-base text-primary/80">
					Now you can customize your profile and share it!
				</p>
			</header>

			<div className="space-y-2">
				<div className="flex h-12 items-center justify-between gap-2 rounded-lg bg-secondary p-1.5 pl-3 font-medium text-base">
					<span className="truncate text-muted-foreground">
						{domain}/<span className="text-foreground">{page.handle}</span>
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon-lg"
						aria-label={isCopied ? "Copied" : "Copy link"}
						onClick={handleCopy}
						className="rounded-md hover:bg-background"
					>
						<span className="relative inline-grid place-items-center">
							<AnimatePresence initial={false} mode="popLayout">
								<motion.span
									key={isCopied ? "copied" : "copy-link"}
									initial={
										reduceMotion
											? false
											: {
													opacity: 0,
													scale: 0.25,
													filter: "blur(4px)",
												}
									}
									animate={{
										opacity: 1,
										scale: 1,
										filter: "blur(0px)",
									}}
									exit={{
										opacity: 0,
										scale: 0.25,
										filter: "blur(4px)",
									}}
									transition={{
										type: "spring",
										duration: 0.3,
										bounce: 0,
									}}
									className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
								>
									{isCopied ? (
										<Check className="size-4" aria-hidden={true} />
									) : (
										<Copy className="size-4" aria-hidden={true} />
									)}
								</motion.span>
							</AnimatePresence>
						</span>
					</Button>
				</div>
				<Button
					type="button"
					variant={"brandBlack"}
					size="xl"
					className="smooth-shadow-xs mt-0 h-12 w-full text-base drop-shadow-md"
					onClick={onGoToProfile}
				>
					{actionLabel}
				</Button>
			</div>
		</section>
	);
}
