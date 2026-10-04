"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@grabbin/ui/components/alert-dialog";
import { Button } from "@grabbin/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldTitle,
} from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, GlobeX } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle as StatusCheck } from "reicon-react/icons/CheckCircle";
import { Verified } from "reicon-react/icons/Verified";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

const statusLabels = {
	waiting_dns: "Waiting for DNS records",
	provisioning: "Setting up HTTPS",
	active: "Connected",
	deleting: "Disconnecting",
	expired: "Pro plan ended",
} as const;

function DomainStatusIcon({ status }: { status: keyof typeof statusLabels }) {
	switch (status) {
		case "active":
			return (
				<StatusCheck
					aria-hidden="true"
					weight="Filled"
					className="size-6 text-brand-green"
				/>
			);
		case "expired":
			return <GlobeX aria-hidden="true" className="size-6" />;
		default:
			return <Loading aria-hidden="true" className="size-6" />;
	}
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function CopyStateIcon({
	copied,
	reduceMotion,
}: {
	copied: boolean;
	reduceMotion: boolean;
}) {
	return (
		<span className="relative inline-grid place-items-center">
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					key={copied ? "copied" : "copy"}
					initial={
						reduceMotion
							? false
							: { opacity: 0, scale: 0.25, filter: "blur(4px)" }
					}
					animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
					exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
					transition={{ type: "spring", duration: 0.3, bounce: 0 }}
					className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
				>
					{copied ? (
						<Check className="size-4" aria-hidden="true" />
					) : (
						<Copy className="size-4" aria-hidden="true" />
					)}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

export default function CustomDomainTabContent({
	active,
	handle,
	isPro,
	onUpgrade,
}: {
	active: boolean;
	handle?: string;
	isPro: boolean;
	onUpgrade: () => void;
}) {
	const queryClient = useQueryClient();
	const [hostname, setHostname] = useState("");
	const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
	const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
	const reduceMotion = useReducedMotion() ?? false;
	const queryKey = ["page-domain", handle];
	const domainQuery = useQuery({
		queryKey,
		queryFn: async () => {
			if (!handle) throw new Error("Could not find this page.");
			const response = await apiClient.pages[":handle"].domain.$get({
				param: { handle },
			});
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			return response.json();
		},
		enabled: active && Boolean(handle),
		refetchInterval: (query) =>
			query.state.data?.domain &&
			["waiting_dns", "provisioning", "deleting"].includes(
				query.state.data.domain.status,
			)
				? 60_000
				: false,
	});
	const domain = domainQuery.data?.domain;
	const checkLabel = domain?.status === "active" ? "Check status" : "Check DNS";

	useEffect(() => {
		if (!copiedRecord) return;
		const timeout = window.setTimeout(() => setCopiedRecord(null), 1800);
		return () => window.clearTimeout(timeout);
	}, [copiedRecord]);

	const updateDomain = async () => queryClient.invalidateQueries({ queryKey });
	const connectMutation = useMutation({
		mutationFn: async () => {
			if (!handle) throw new Error("Could not find this page.");
			const response = await apiClient.pages[":handle"].domain.$post(
				{ param: { handle } },
				{
					init: {
						body: JSON.stringify({ hostname }),
						headers: { "Content-Type": "application/json" },
					},
				},
			);
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			return response.json();
		},
		onSuccess: async (result) => {
			setHostname("");
			queryClient.setQueryData(queryKey, result);
			await updateDomain();
		},
		onError: (error) =>
			toast({
				message:
					error instanceof Error
						? error.message
						: "Could not connect this domain.",
				state: "error",
			}),
	});
	const checkMutation = useMutation({
		mutationFn: async () => {
			if (!handle) throw new Error("Could not find this page.");
			const response = await apiClient.pages[":handle"].domain.check.$post({
				param: { handle },
			});
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			return response.json();
		},
		onSuccess: async (result) => {
			queryClient.setQueryData(queryKey, result);
			await updateDomain();
		},
		onError: (error) =>
			toast({
				message:
					error instanceof Error
						? error.message
						: "Could not check this domain.",
				state: "error",
			}),
	});
	const disconnectMutation = useMutation({
		mutationFn: async () => {
			if (!handle) throw new Error("Could not find this page.");
			const response = await apiClient.pages[":handle"].domain.$delete({
				param: { handle },
			});
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			return response.json();
		},
		onSuccess: async (result) => {
			queryClient.setQueryData(queryKey, result);
			setIsDisconnectDialogOpen(false);
			await updateDomain();
		},
		onError: (error) =>
			toast({
				message:
					error instanceof Error
						? error.message
						: "Could not disconnect this domain.",
				state: "error",
			}),
	});

	const copyRecord = async (key: string, value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedRecord(key);
		} catch {
			toast({ message: "Could not copy this value.", state: "error" });
		}
	};

	const submitHostname = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isPro || !hostname.trim() || connectMutation.isPending) return;
		connectMutation.mutate();
	};

	return (
		<>
			<Field className="min-w-0">
				<FieldTitle className="gap-1 text-base">
					Custom domain
					<Verified
						aria-hidden="true"
						weight="Filled"
						className="size-5 text-brand-blue"
					/>
				</FieldTitle>
				<FieldDescription id="custom-domain-description">
					Connect a domain you own to use it for this page.
				</FieldDescription>

				{!handle ? (
					<p className="mt-4 text-muted-foreground text-sm">
						Open settings from a page to connect its domain.
					</p>
				) : domainQuery.isPending ? (
					<p className="mt-4 text-muted-foreground text-sm" aria-live="polite">
						Loading domain settings…
					</p>
				) : domainQuery.isError ? (
					<div className="mt-4 flex flex-col items-start gap-2">
						<p className="text-destructive text-sm" role="alert">
							{domainQuery.error instanceof Error
								? domainQuery.error.message
								: "Could not load domain settings."}
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void domainQuery.refetch()}
						>
							Try again
						</Button>
					</div>
				) : domain ? (
					<div className="mt-4 flex min-w-0 flex-col gap-4">
						<section
							aria-label="Connected custom domain"
							className="smooth-shadow-ring-xs smooth-ring-neutral-300/40 flex min-w-0 flex-col items-start gap-1 rounded-xl p-3 pl-5"
						>
							<div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">
								<p className="min-w-0 break-all font-medium text-base">
									{domain.hostname}
								</p>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full">
									<DomainStatusIcon status={domain.status} />
								</span>
							</div>
							<span className="sr-only" role="status">
								{statusLabels[domain.status]}
							</span>
							{domain.lastError && (
								<p
									className="wrap-break-word text-destructive text-xs"
									role="status"
								>
									{domain.lastError}
								</p>
							)}
							{!domain.canConfigure && domain.graceEndsAt && (
								<p className="text-muted-foreground text-sm">
									Your Pro plan has ended. This domain remains connected until{" "}
									<strong className="font-medium text-primary">
										{formatDate(domain.graceEndsAt)}
									</strong>
									while your existing grace period lasts.
								</p>
							)}
						</section>

						{domain.records.length > 0 && domain.status !== "active" && (
							<section
								aria-label="Required DNS records"
								className="flex flex-col gap-3"
							>
								<p className="font-medium text-sm">
									Add these records at your domain provider.
								</p>
								{domain.records.map((record) => {
									const recordKey = `${record.type}:${record.name}`;
									const fields = [
										{ label: "Type", value: record.type },
										{ label: "Name", value: record.name },
										{ label: "Target", value: record.value },
									];
									return (
										<div
											key={recordKey}
											className="smooth-shadow-ring-xs smooth-ring-neutral-300/40 flex flex-col gap-0 rounded-xl p-1 py-2"
										>
											{fields.map((field) => {
												const key = `${recordKey}:${field.label}`;
												const isCopied = copiedRecord === key;

												return (
													<div
														key={field.label}
														className="flex flex-row items-center gap-1 pr-0.5"
													>
														<span className="h-10 p-2 px-3 font-medium text-muted-foreground text-sm">
															{field.label}
														</span>
														<span className="h-10 min-w-0 flex-1 break-all p-2 text-sm">
															{field.value}
														</span>
														<Button
															variant="ghost"
															size="icon-lg"
															aria-label={`${isCopied ? "Copied" : "Copy"} ${record.type} ${field.label.toLowerCase()}`}
															onClick={() => void copyRecord(key, field.value)}
															className={"size-9"}
														>
															<CopyStateIcon
																copied={isCopied}
																reduceMotion={reduceMotion}
															/>
														</Button>
													</div>
												);
											})}
										</div>
									);
								})}
							</section>
						)}

						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="xl"
								disabled={
									checkMutation.isPending || domain.status === "deleting"
								}
								onClick={() => checkMutation.mutate()}
								aria-label={
									checkMutation.isPending ? "Checking domain" : undefined
								}
							>
								<span className="relative inline-grid place-items-center">
									<span
										aria-hidden={checkMutation.isPending}
										className={
											checkMutation.isPending ? "invisible" : undefined
										}
									>
										{checkLabel}
									</span>
									{checkMutation.isPending && (
										<Loading className="absolute size-4" />
									)}
								</span>
							</Button>
							<Button
								variant="destructive"
								size="xl"
								disabled={
									disconnectMutation.isPending || domain.status === "deleting"
								}
								onClick={() => setIsDisconnectDialogOpen(true)}
								className="min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100"
							>
								Disconnect
							</Button>
						</div>
					</div>
				) : (
					<form
						className="mt-4 flex min-w-0 flex-col gap-3"
						onSubmit={submitHostname}
					>
						{isPro ? (
							<>
								<InputGroup className="h-11">
									<InputGroupInput
										id="custom-domain"
										value={hostname}
										onChange={(event) => setHostname(event.target.value)}
										aria-label="Custom domain"
										aria-describedby="custom-domain-description"
										autoComplete="url"
										inputMode="url"
										placeholder="links.example.com"
										className="w-0 min-w-0 text-base!"
									/>
									<InputGroupAddon align="inline-end" className="shrink-0 pr-2">
										<InputGroupButton
											aria-label="Connect custom domain"
											disabled={!hostname.trim() || connectMutation.isPending}
											variant="outline"
											className="h-9 min-w-[4.5rem] justify-center rounded-md px-3 text-primary hover:bg-background hover:text-primary"
											type="submit"
										>
											{connectMutation.isPending ? (
												<Loading className="size-4" />
											) : (
												"Connect"
											)}
										</InputGroupButton>
									</InputGroupAddon>
								</InputGroup>
								<p className="text-muted-foreground text-xs">
									Enter a subdomain, such as links.example.com. Root domains are
									not supported.
								</p>
							</>
						) : (
							<div className="flex flex-col items-start gap-2 rounded-lg bg-secondary p-3.5">
								<p className="text-sm">Custom domains are available on Pro.</p>
								<Button type="button" variant="outline" onClick={onUpgrade}>
									Upgrade to Pro
								</Button>
							</div>
						)}
					</form>
				)}
			</Field>

			<AlertDialog
				open={isDisconnectDialogOpen}
				onOpenChange={setIsDisconnectDialogOpen}
			>
				<AlertDialogContent
					overlayProps={{ forceRender: true, className: "z-[60]" }}
					className="z-[70] gap-0 overflow-hidden p-5"
				>
					<div className="flex h-full w-full min-w-0 flex-col gap-4">
						<AlertDialogHeader>
							<AlertDialogTitle>Disconnect custom domain?</AlertDialogTitle>
							<AlertDialogDescription>
								<span className="font-medium text-primary">
									{domain?.hostname}
								</span>{" "}
								will stop opening this page. You can connect it again later.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
							<AlertDialogCancel
								className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
								size="xl"
								variant="outline"
								disabled={disconnectMutation.isPending}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								size="xl"
								disabled={disconnectMutation.isPending}
								onClick={(event) => {
									event.preventDefault();
									disconnectMutation.mutate();
								}}
								className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
							>
								{disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
