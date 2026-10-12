"use client";

import Loading from "@grabbin/ui/components/loading";
import { GlobeX } from "lucide-react";
import { CheckCircle as StatusCheck } from "reicon-react/icons/CheckCircle";

const statusLabels = {
	waiting_dns: "Waiting for DNS records",
	provisioning: "Setting up HTTPS",
	active: "Connected",
	deleting: "Disconnecting",
	expired: "Pro plan ended",
} as const;

export function DomainStatus({
	status,
}: {
	status: keyof typeof statusLabels;
}) {
	let icon = <Loading aria-hidden="true" className="size-4" />;
	if (status === "active") {
		icon = (
			<StatusCheck
				aria-hidden="true"
				weight="Filled"
				className="size-6 text-brand-green"
			/>
		);
	} else if (status === "expired") {
		icon = <GlobeX aria-hidden="true" className="size-6" />;
	}

	return (
		<>
			{icon}
			<span className="sr-only" role="status">
				{statusLabels[status]}
			</span>
		</>
	);
}
