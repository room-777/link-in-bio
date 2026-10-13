"use client";

import type { PageDomainResponse } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import { useReducedMotion } from "motion/react";
import { CopyStateIcon } from "@/components/copy-state-icon";
import { formatDate } from "@/utils/format-date";
import { DomainStatus } from "./domain-status";

type Domain = NonNullable<PageDomainResponse["domain"]>;

export function ConnectedDomainDetails({
	domain,
	copiedKey,
	onCopy,
}: {
	domain: Domain;
	copiedKey: string | null;
	onCopy: (key: string, value: string) => void;
}) {
	const reduceMotion = useReducedMotion() ?? false;

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<section
				aria-label="Connected custom domain"
				className="smooth-shadow-xs flex w-3xs min-w-0 max-w-sm shrink-0 flex-col items-start gap-1 rounded-lg border border-black/8 p-2 pl-4"
			>
				<div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">
					<p className="min-w-0 truncate break-all text-sm">
						{domain.hostname}
					</p>
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full">
						<DomainStatus status={domain.status} />
					</span>
				</div>
			</section>
			{domain.lastError && (
				<p className="wrap-break-word text-destructive text-xs" role="status">
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
									const isCopied = copiedKey === key;
									const copyLabel = isCopied ? "Copied" : "Copy";

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
													aria-label={`${copyLabel} ${record.type} ${field.label.toLowerCase()}`}
													onClick={() => onCopy(key, field.value)}
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
	);
}
