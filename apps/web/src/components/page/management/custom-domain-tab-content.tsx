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
import { overlay } from "overlay-kit";
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

function DisconnectDomainDialog({
	hostname,
	open,
	close,
	unmount,
	onDisconnect,
}: {
	hostname: string;
	open: boolean;
	close: () => void;
	unmount: () => void;
	onDisconnect: () => Promise<void>;
}) {
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const confirmDisconnect = async (event: React.MouseEvent) => {
		event.preventDefault();
		setIsDisconnecting(true);
		try {
			await onDisconnect();
			close();
		} catch {
			// The mutation reports its error through the shared toast.
		} finally {
			setIsDisconnecting(false);
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => !nextOpen && close()}
			onOpenChangeComplete={(nextOpen) => !nextOpen && unmount()}
		>
			<AlertDialogContent
				overlayProps={{ forceRender: true, className: "z-[60]" }}
				className="z-[70] gap-0 overflow-hidden p-5"
			>
				<div className="flex h-full w-full min-w-0 flex-col gap-4">
					<AlertDialogHeader>
						<AlertDialogTitle>Disconnect custom domain?</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="font-medium text-primary">{hostname}</span> will
							stop opening this page. You can connect it again later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
						<AlertDialogCancel
							className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
							size="xl"
							variant="outline"
							disabled={isDisconnecting}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							size="xl"
							disabled={isDisconnecting}
							onClick={(event) => void confirmDisconnect(event)}
							className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
						>
							{isDisconnecting ? "Disconnecting…" : "Disconnect"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}

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
			return <Loading aria-hidden="true" className="size-4" />;
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
			<Field className="no-scrollbar scroll-fade-y h-full min-h-0 min-w-0 gap-1 overflow-y-auto overflow-x-hidden px-1 *:shrink-0">
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
						<Loading />
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
					<div className="mt-4 flex min-w-0 flex-1 flex-col gap-4">
						<div className="flex min-w-0 flex-1 flex-col gap-4">
							<div className="flex shrink-0 flex-col gap-1.5">
								<section
									aria-label="Connected custom domain"
									className="smooth-shadow-xs flex w-3xs min-w-0 max-w-sm shrink-0 flex-col items-start gap-1 rounded-lg border border-black/8 p-2 pl-4"
								>
									<div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">
										<p className="min-w-0 truncate break-all text-sm">
											{domain.hostname}
										</p>
										<span className="flex size-7 shrink-0 items-center justify-center rounded-full">
											<DomainStatusIcon status={domain.status} />
										</span>
									</div>
									<span className="sr-only" role="status">
										{statusLabels[domain.status]}
									</span>
								</section>
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
							</div>

							{domain.records.length > 0 && domain.status !== "active" && (
								<section
									aria-label="Required DNS records"
									className="mt-4 flex shrink-0 flex-col gap-3"
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
												className="smooth-shadow-xs flex min-w-0 flex-col gap-3 rounded-xl border border-black/8 p-3"
											>
												{fields.map((field) => {
													const key = `${recordKey}:${field.label}`;
													const isCopied = copiedRecord === key;

													return (
														<div
															key={field.label}
															className="flex min-w-0 flex-col gap-1"
														>
															<span className="font-medium text-primary text-xs">
																{field.label}
															</span>
															<div className="flex min-h-11 min-w-0 items-center gap-1 rounded-lg bg-brand-gray p-1 pl-3 dark:bg-input/30">
																<span
																	className="min-w-0 flex-1 truncate py-1 text-sm"
																	title={field.value}
																>
																	{field.value}
																</span>
																<Button
																	variant="outline"
																	size="icon-lg"
																	aria-label={`${isCopied ? "Copied" : "Copy"} ${record.type} ${field.label.toLowerCase()}`}
																	onClick={() =>
																		void copyRecord(key, field.value)
																	}
																	className="size-9 shrink-0 rounded-md"
																>
																	<CopyStateIcon
																		copied={isCopied}
																		reduceMotion={reduceMotion}
																	/>
																</Button>
															</div>
														</div>
													);
												})}
											</div>
										);
									})}
								</section>
							)}
						</div>

						<div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2">
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
								onClick={() => {
									if (!domain) return;
									overlay.open(({ isOpen, close, unmount }) => (
										<DisconnectDomainDialog
											hostname={domain.hostname}
											open={isOpen}
											close={close}
											unmount={unmount}
											onDisconnect={() =>
												disconnectMutation.mutateAsync().then(() => undefined)
											}
										/>
									));
								}}
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
		</>
	);
}
