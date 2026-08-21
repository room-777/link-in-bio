"use client";

import type {
  OwnedPageListResponse,
  PageResponse,
  UpdatePageRequest,
} from "@grabbin/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  myPageQueryKey,
  ownedPagesQueryKey,
  pageQueryKey,
  updatePage,
} from "@/lib/client/page-api";

export const AUTO_SAVE_DELAY = 1000;

type EditablePageFields = Pick<
  PageResponse,
  "name" | "bio" | "image" | "imageSource" | "imageCrop"
>;

function editableFields(page: PageResponse): EditablePageFields {
  return {
    name: page.name,
    bio: page.bio,
    image: page.image,
    imageSource: page.imageSource,
    imageCrop: page.imageCrop,
  };
}

function changedFields(
  draft: EditablePageFields,
  saved: EditablePageFields,
): UpdatePageRequest {
  const changes: UpdatePageRequest = {};
  for (const field of [
    "name",
    "bio",
    "image",
    "imageSource",
    "imageCrop",
  ] as const) {
    if (draft[field] !== saved[field]) {
      Object.assign(changes, { [field]: draft[field] });
    }
  }
  return changes;
}

export function usePageAutoSave(page: PageResponse) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => editableFields(page));
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const savedRef = useRef(draft);
  const pendingRef = useRef<UpdatePageRequest>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const mutation = useMutation({
    mutationFn: (changes: UpdatePageRequest) =>
      updatePage(page.handle, changes),
    throwOnError: false,
  });

  const updateCache = useCallback(
    (nextPage: PageResponse) => {
      queryClient.setQueryData(pageQueryKey(page.handle), nextPage);
      queryClient.setQueryData(
        myPageQueryKey,
        (current: { page: PageResponse | null } | undefined) =>
          current?.page?.id === nextPage.id
            ? { ...current, page: nextPage }
            : current,
      );
      queryClient.setQueryData<OwnedPageListResponse | undefined>(
        ownedPagesQueryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((candidate) =>
                  candidate.id === nextPage.id
                    ? {
                        ...candidate,
                        handle: nextPage.handle,
                        name: nextPage.name,
                        image: nextPage.image,
                        updatedAt: nextPage.updatedAt,
                      }
                    : candidate,
                ),
              }
            : current,
      );
    },
    [page.handle, queryClient],
  );

  const acceptPage = useCallback(
    (nextPage: PageResponse) => {
      const nextSaved = editableFields(nextPage);
      const nextDraft = {
        ...nextSaved,
        name: draftRef.current.name,
        bio: draftRef.current.bio,
      };
      savedRef.current = nextSaved;
      draftRef.current = nextDraft;
      pendingRef.current = changedFields(nextDraft, nextSaved);
      setDraft(nextDraft);
      updateCache({ ...nextPage, ...pendingRef.current });
    },
    [updateCache],
  );

  const save = useCallback(
    async (changes: UpdatePageRequest) => {
      const request = ++requestRef.current;
      const previous =
        queryClient.getQueryData<PageResponse>(pageQueryKey(page.handle)) ??
        page;
      updateCache({ ...previous, ...changes });
      setError(null);

      try {
        const result = await mutation.mutateAsync(changes);
        if (request === requestRef.current) acceptPage(result.page);
        return result.page;
      } catch (caught) {
        if (request === requestRef.current) {
          updateCache(previous);
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not save changes.",
          );
        }
        return null;
      }
    },
    [acceptPage, mutation, page, queryClient, updateCache],
  );

  const savePending = useCallback(async () => {
    const changes = pendingRef.current;
    pendingRef.current = {};
    if (!Object.keys(changes).length) return;

    await save(changes);
  }, [save]);

  const updateField = useCallback(
    (field: "name" | "bio", value: string) => {
      const nextDraft = { ...draftRef.current, [field]: value };
      draftRef.current = nextDraft;
      pendingRef.current = changedFields(nextDraft, savedRef.current);
      setDraft(nextDraft);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void savePending();
      }, AUTO_SAVE_DELAY);
    },
    [savePending],
  );

  useEffect(() => {
    updateCache(page);
  }, [page, updateCache]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return {
    acceptPage,
    draft,
    error,
    isSaving: mutation.isPending,
    save,
    updateField,
  };
}
