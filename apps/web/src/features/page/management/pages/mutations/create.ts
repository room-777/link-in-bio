import { pageHandleResponseSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

async function createPage(handle: string) {
	const response = await apiClient.pages.$post({ json: { handle } });
	if (!response.ok) throw new Error(await getApiErrorMessage(response));
	return v.parse(pageHandleResponseSchema, await response.json()).page.handle;
}

export function useCreatePage() {
	return useMutation({ mutationFn: createPage });
}
