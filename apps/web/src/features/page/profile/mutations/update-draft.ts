import type { PageImageCrop, UpdatePageDraft } from "@grabbin/api";
import { updatePageDraftSchema } from "@grabbin/api";
import { useMutation } from "@tanstack/react-query";
import * as v from "valibot";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";

type SavedPage = {
	name: string | null;
	bio: string | null;
	imageKey: string | null;
	imageCrop: PageImageCrop | null;
};

async function updatePageDraft(handle: string, changes: UpdatePageDraft) {
	const response = await apiClient.pages[":handle"].$patch(
		{ param: { handle } },
		{
			init: {
				body: JSON.stringify(v.parse(updatePageDraftSchema, changes)),
				headers: { "Content-Type": "application/json" },
			},
		},
	);
	if (!response.ok) throw new Error(await getApiErrorMessage(response));

	const body = await response.json();
	if (!("page" in body) || !body.page || typeof body.page !== "object") {
		throw new Error("Could not save changes.");
	}

	return {
		name:
			"name" in body.page && typeof body.page.name === "string"
				? body.page.name
				: null,
		bio:
			"bio" in body.page && typeof body.page.bio === "string"
				? body.page.bio
				: null,
		imageKey:
			"imageKey" in body.page && typeof body.page.imageKey === "string"
				? body.page.imageKey
				: null,
		imageCrop:
			"imageCrop" in body.page && body.page.imageCrop
				? (body.page.imageCrop as PageImageCrop)
				: null,
	} satisfies SavedPage;
}

export function useUpdatePageDraftMutation() {
	return useMutation({
		mutationFn: ({
			handle,
			changes,
		}: {
			handle: string;
			changes: UpdatePageDraft;
		}) => updatePageDraft(handle, changes),
	});
}
