import { pageDomainResponseSchema } from "@grabbin/api";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

export async function fetchCustomDomain(handle: string) {
	const response = await apiClient.pages[":handle"].domain.$get({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageDomainResponseSchema, await response.json());
}

export async function connectCustomDomain(handle: string, hostname: string) {
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
	return v.parse(pageDomainResponseSchema, await response.json());
}

export async function checkCustomDomain(handle: string) {
	const response = await apiClient.pages[":handle"].domain.check.$post({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageDomainResponseSchema, await response.json());
}

export async function disconnectCustomDomain(handle: string) {
	const response = await apiClient.pages[":handle"].domain.$delete({
		param: { handle },
	});
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageDomainResponseSchema, await response.json());
}
