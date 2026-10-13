"use client";

import type { PageDomainResponse } from "@grabbin/api";
import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { overlay } from "overlay-kit";
import { DisconnectDomainDialog } from "./disconnect-domain-dialog";

type Domain = NonNullable<PageDomainResponse["domain"]>;

export function ConnectedDomainActions({
	domain,
	isChecking,
	isDisconnecting,
	onCheck,
	onDisconnect,
}: {
	domain: Domain;
	isChecking: boolean;
	isDisconnecting: boolean;
	onCheck: () => void;
	onDisconnect: () => Promise<void>;
}) {
	const checkLabel = domain.status === "active" ? "Check status" : "Check DNS";

	return (
		<div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2">
			<Button
				variant="outline"
				size="xl"
				disabled={isChecking || domain.status === "deleting"}
				onClick={onCheck}
				aria-label={isChecking ? "Checking domain" : undefined}
			>
				<span className="relative inline-grid place-items-center">
					<span
						aria-hidden={isChecking}
						className={isChecking ? "invisible" : undefined}
					>
						{checkLabel}
					</span>
					{isChecking && <Loading className="absolute size-4" />}
				</span>
			</Button>
			<Button
				variant="destructive"
				size="xl"
				disabled={isDisconnecting || domain.status === "deleting"}
				onClick={() =>
					overlay.open(({ isOpen, close, unmount }) => (
						<DisconnectDomainDialog
							hostname={domain.hostname}
							open={isOpen}
							close={close}
							unmount={unmount}
							onDisconnect={onDisconnect}
						/>
					))
				}
				className="min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100"
			>
				Disconnect
			</Button>
		</div>
	);
}
