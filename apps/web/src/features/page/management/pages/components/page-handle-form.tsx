"use client";

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
import { Globe } from "lucide-react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";
import { CloseCircle } from "reicon-react/icons/CloseCircle";
import { Loader } from "reicon-react/icons/Loader";
import { usePageHandleForm } from "../hooks/use-page-handle-form";

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
	const {
		availability,
		error,
		handle,
		handleSubmit,
		hasHandleChange,
		isSubmitting,
		onHandleChange,
	} = usePageHandleForm({ initialHandle, onSubmit });

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
									onChange={(event) => onHandleChange(event.target.value)}
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
