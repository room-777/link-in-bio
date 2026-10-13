"use client";

import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import type { FormEvent } from "react";

export function ConnectDomainForm({
	isPro,
	hostname,
	isPending,
	onHostnameChange,
	onSubmit: handleSubmit,
	onUpgrade: handleUpgrade,
}: {
	isPro: boolean;
	hostname: string;
	isPending: boolean;
	onHostnameChange: (hostname: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onUpgrade: () => void;
}) {
	if (!isPro) {
		return (
			<div className="flex flex-col items-start gap-2 rounded-lg bg-secondary p-3.5">
				<p className="text-sm">Custom domains are available on Pro.</p>
				<Button type="button" variant="outline" onClick={handleUpgrade}>
					Upgrade to Pro
				</Button>
			</div>
		);
	}

	return (
		<form className="mt-4 flex min-w-0 flex-col gap-3" onSubmit={handleSubmit}>
			<InputGroup className="h-11">
				<InputGroupInput
					id="custom-domain"
					value={hostname}
					onChange={(event) => onHostnameChange(event.target.value)}
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
						disabled={!hostname.trim() || isPending}
						variant="outline"
						className="h-9 min-w-[4.5rem] justify-center rounded-md px-3 text-primary hover:bg-background hover:text-primary"
						type="submit"
					>
						{isPending && <Loading className="size-4" />}
						{!isPending && "Connect"}
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<p className="text-muted-foreground text-xs">
				Enter a subdomain, such as links.example.com. Root domains are not
				supported.
			</p>
		</form>
	);
}
