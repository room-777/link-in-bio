"use client";

import { env } from "@grabbin/env/web";
import { Button } from "@grabbin/ui/components/button";

const apiUrl = env.NEXT_PUBLIC_SERVER_URL;

export default function CalendlyConnectButton({ isPro }: { isPro: boolean }) {
	return (
		<Button
			render={
				isPro ? (
					<a
						href={`${apiUrl}/auth/calendly/connect`}
						aria-label="Connect to Calendly"
					>
						Connect to Calendly
					</a>
				) : undefined
			}
			onClick={(event) => {
				event.preventDefault();
				const returnTo = `${window.location.pathname}${window.location.search}`;
				const params = new URLSearchParams({ return_to: returnTo });
				window.location.assign(`${apiUrl}/auth/calendly/connect?${params}`);
			}}
			variant="outline"
			size="lg"
			disabled={!isPro}
		>
			<img
				src="/api/provider-icons/calendly.svg?v=3"
				alt=""
				aria-hidden="true"
				className="size-4 object-contain"
			/>
			Connect to Calendly
		</Button>
	);
}
