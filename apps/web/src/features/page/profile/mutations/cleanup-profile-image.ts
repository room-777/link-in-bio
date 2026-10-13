import { pageImageKeySchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient } from "@/lib/api-client";

export async function cleanupUploadedPageProfileImage(
	handle: string,
	key: string,
) {
	const parsed = v.safeParse(pageImageKeySchema, { key });
	if (!parsed.success) return;

	await apiClient.pages[":handle"]["profile-image"]
		.$delete(
			{ param: { handle } },
			{
				init: {
					body: JSON.stringify(parsed.output),
					headers: { "Content-Type": "application/json" },
				},
			},
		)
		.catch(() => undefined);
}

export function useCleanupPageProfileImageMutation() {
	return useMutation({
		mutationFn: ({ handle, key }: { handle: string; key: string }) =>
			cleanupUploadedPageProfileImage(handle, key),
	});
}
