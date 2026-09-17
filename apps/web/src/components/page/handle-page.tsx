"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { pageQueryKey, pageQueryOptions } from "@/lib/page-query";
import PageOnboardingForm from "./page-onboarding-form";

export default function HandlePage({ handle }: { handle: string }) {
	const queryClient = useQueryClient();
	const { data: page } = useSuspenseQuery(pageQueryOptions(handle));

	if (!page) {
		return (
			<main className="mx-auto flex min-h-svh max-w-sm items-center justify-center p-6 text-muted-foreground text-sm">
				Page not found.
			</main>
		);
	}

	if (!page.onboarding && page.isOwner) {
		return (
			<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
				<PageOnboardingForm
					page={page}
					onComplete={(nextPage) => {
						queryClient.setQueryData(pageQueryKey(handle), nextPage);
					}}
				/>
			</main>
		);
	}

	return (
		<main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-start gap-8 p-6 px-12 pt-12 min-[90rem]:mx-0 min-[90rem]:min-h-dvh min-[90rem]:max-w-2xl min-[90rem]:pt-16">
			<article className="flex min-w-0 flex-col gap-8">
				<div className="relative isolate size-28 rounded-full bg-brand-light-gray sm:size-32 min-[90rem]:size-46">
					{page.image && (
						<img
							src={page.image}
							alt=""
							className="size-full rounded-full object-cover"
						/>
					)}
				</div>
				<div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
					<h1 className="editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap font-bold text-3xl leading-tight tracking-tight outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-[40px]">
						{page.name ?? page.handle}
					</h1>
					{page.bio && (
						<p className="editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap px-0.5 text-base text-primary/80 leading-6 outline-none transition-[background-color,box-shadow] duration-150 ease-out min-[90rem]:text-xl min-[90rem]:leading-8">
							{page.bio}
						</p>
					)}
				</div>
			</article>
		</main>
	);
}
