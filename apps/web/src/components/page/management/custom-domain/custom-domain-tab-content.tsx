"use client";

import { Button } from "@grabbin/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldTitle,
} from "@grabbin/ui/components/field";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { type FormEvent, type ReactNode, useState } from "react";
import { Verified } from "reicon-react/icons/Verified";
import { useClipboardCopy } from "@/hooks/use-clipboard-copy";
import { useCustomDomain } from "@/hooks/use-custom-domain";
import { getErrorMessage } from "@/lib/error-message";
import { ConnectDomainForm } from "./connect-domain-form";
import { ConnectedDomainActions } from "./connected-domain-actions";
import { ConnectedDomainDetails } from "./connected-domain-details";

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
	const [hostname, setHostname] = useState("");
	const { copiedKey, copyText } = useClipboardCopy();
	const { domainQuery, connectMutation, checkMutation, disconnectMutation } =
		useCustomDomain(handle, active);
	const domain = domainQuery.data?.domain;

	const copyRecord = async (key: string, value: string) => {
		const copied = await copyText(value, key);
		if (!copied) {
			toast({ message: "Could not copy this value.", state: "error" });
		}
	};

	const submitHostname = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isPro || !hostname.trim() || connectMutation.isPending) return;
		connectMutation.mutate(hostname.trim(), {
			onSuccess: () => setHostname(""),
		});
	};

	const renderField = (content: ReactNode) => (
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
			{content}
		</Field>
	);

	if (!handle) {
		return renderField(
			<p className="mt-4 text-muted-foreground text-sm">
				Open settings from a page to connect its domain.
			</p>,
		);
	}

	if (domainQuery.isPending) {
		return renderField(
			<p className="mt-4 text-muted-foreground text-sm" aria-live="polite">
				<Loading />
			</p>,
		);
	}

	if (domainQuery.isError) {
		return renderField(
			<div className="mt-4 flex flex-col items-start gap-2">
				<p className="text-destructive text-sm" role="alert">
					{getErrorMessage(
						domainQuery.error,
						"Could not load domain settings.",
					)}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void domainQuery.refetch()}
				>
					Try again
				</Button>
			</div>,
		);
	}

	if (!domain) {
		return renderField(
			<ConnectDomainForm
				isPro={isPro}
				hostname={hostname}
				isPending={connectMutation.isPending}
				onHostnameChange={setHostname}
				onSubmit={submitHostname}
				onUpgrade={onUpgrade}
			/>,
		);
	}

	return renderField(
		<div className="mt-4 flex min-w-0 flex-1 flex-col gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-4">
				<ConnectedDomainDetails
					domain={domain}
					copiedKey={copiedKey}
					onCopy={(key, value) => void copyRecord(key, value)}
				/>
			</div>
			<ConnectedDomainActions
				domain={domain}
				isChecking={checkMutation.isPending}
				isDisconnecting={disconnectMutation.isPending}
				onCheck={() => checkMutation.mutate()}
				onDisconnect={() =>
					disconnectMutation.mutateAsync().then(() => undefined)
				}
			/>
		</div>,
	);
}
