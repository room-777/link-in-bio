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
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, LoaderCircle, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Verified } from "reicon-react/icons/Verified";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

const statusLabels = {
	waiting_dns: "Waiting for DNS records",
	provisioning: "Setting up HTTPS",
	active: "Connected",
	deleting: "Disconnecting",
	expired: "Pro plan ended",
} as const;

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
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
			window.setTimeout(() => setCopiedRecord(null), 1600);
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
							className="flex min-w-0 flex-col gap-3 rounded-lg bg-secondary p-3.5"
						>
							<div className="flex min-w-0 items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="break-all font-medium text-base">
										{domain.hostname}
									</p>
									<p
										className="mt-1 text-muted-foreground text-sm"
										aria-live="polite"
									>
										{statusLabels[domain.status]}
									</p>
								</div>
								{domain.status === "active" && (
									<Check
										aria-label="Connected"
										className="size-5 shrink-0 text-brand-green"
									/>
								)}
							</div>
							{domain.lastError && (
								<p className="text-muted-foreground text-sm" role="status">
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
									const key = `${record.type}:${record.name}`;
									return (
										<div
											key={key}
											className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.25rem] items-start gap-x-2 gap-y-1 rounded-lg border p-3"
										>
											<span className="row-span-2 pt-0.5 font-medium text-muted-foreground text-xs">
												{record.type}
											</span>
											<span className="break-all font-mono text-xs">
												{record.name}
											</span>
											<span className="row-span-2 flex justify-end">
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={`Copy ${record.type} record value`}
													onClick={() => void copyRecord(key, record.value)}
												>
													{copiedRecord === key ? (
														<Check aria-hidden="true" />
													) : (
														<Copy aria-hidden="true" />
													)}
												</Button>
											</span>
											<span className="break-all font-mono text-muted-foreground text-xs">
												{record.value}
											</span>
										</div>
									);
								})}
							</section>
						)}

						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								disabled={
									checkMutation.isPending || domain.status === "deleting"
								}
								onClick={() => checkMutation.mutate()}
							>
								{checkMutation.isPending && (
									<LoaderCircle
										aria-hidden="true"
										className="size-4 animate-spin"
									/>
								)}
								{domain.status === "active" ? "Check status" : "Check DNS"}
							</Button>
							<Button
								variant="ghost"
								className="text-destructive hover:text-destructive"
								disabled={
									disconnectMutation.isPending || domain.status === "deleting"
								}
								onClick={() => setIsDisconnectDialogOpen(true)}
							>
								<Trash2 aria-hidden="true" className="size-4" />
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
											className="h-9 rounded-md px-3 text-primary hover:bg-background hover:text-primary"
											type="submit"
										>
											{connectMutation.isPending ? "Connecting…" : "Connect"}
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
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Disconnect custom domain?</AlertDialogTitle>
						<AlertDialogDescription>
							{domain?.hostname} will stop opening this page. You can connect it
							again later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={disconnectMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={disconnectMutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								disconnectMutation.mutate();
							}}
						>
							{disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
