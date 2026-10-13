"use client";

import { pageHandleSchema } from "@grabbin/page-handle";
import { type FormEvent, useState } from "react";
import * as v from "valibot";
import { getErrorMessage } from "@/lib/error-message";
import { usePageHandleCheckQuery } from "@/query/page-handle/check";
import { useDebouncedValue } from "./use-debounced-value";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

export function usePageHandleForm({
	initialHandle = "",
	onSubmit,
}: {
	initialHandle?: string;
	onSubmit: (handle: string) => Promise<void>;
}) {
	const normalizedInitialHandle = initialHandle.trim();
	const [handle, setHandle] = useState(normalizedInitialHandle);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const debouncedHandle = useDebouncedValue(handle.trim(), 250);
	const {
		data: handleCheck,
		isError: isHandleCheckError,
		isFetching: isHandleCheckFetching,
		isPending: isHandleCheckPending,
	} = usePageHandleCheckQuery(debouncedHandle);

	const currentHandle = handle.trim();
	const hasHandleChange =
		currentHandle.toLowerCase() !== normalizedInitialHandle.toLowerCase();
	const isInitialHandle = Boolean(normalizedInitialHandle) && !hasHandleChange;
	const availability: Availability = !currentHandle
		? "idle"
		: isInitialHandle
			? "available"
			: currentHandle !== debouncedHandle ||
					isHandleCheckPending ||
					isHandleCheckFetching
				? "checking"
				: isHandleCheckError
					? "invalid"
					: handleCheck?.reason === "invalid"
						? "invalid"
						: handleCheck?.available
							? "available"
							: "taken";

	const onHandleChange = (nextHandle: string) => {
		setHandle(nextHandle);
		setError("");
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = v.safeParse(pageHandleSchema, handle);
		if (!parsed.success) {
			setError("Please choose a valid handle.");
			return;
		}
		if (availability !== "available") {
			setError(
				availability === "checking"
					? "Please wait until your handle is checked."
					: availability === "invalid"
						? "Please choose a valid handle."
						: "Please choose an available handle.",
			);
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			await onSubmit(parsed.output);
		} catch (caught) {
			setError(getErrorMessage(caught, "Please try again."));
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		availability,
		error,
		handle,
		handleSubmit,
		hasHandleChange,
		isSubmitting,
		onHandleChange,
	};
}
