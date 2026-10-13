"use client";

import { pageHandleSchema } from "@grabbin/page-handle";
import { type FormEvent, useState } from "react";
import * as v from "valibot";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/error-message";
import { usePageHandleCheckQuery } from "../queries/check-handle";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

function getAvailability({
	currentHandle,
	debouncedHandle,
	isInitialHandle,
	isCheckError,
	isFetching,
	isPending,
	handleCheck,
}: {
	currentHandle: string;
	debouncedHandle: string;
	isInitialHandle: boolean;
	isCheckError: boolean;
	isFetching: boolean;
	isPending: boolean;
	handleCheck?: { available: boolean; reason?: string | null };
}): Availability {
	if (!currentHandle) return "idle";
	if (isInitialHandle) return "available";
	if (currentHandle !== debouncedHandle || isPending || isFetching) {
		return "checking";
	}
	if (isCheckError || handleCheck?.reason === "invalid") return "invalid";
	return handleCheck?.available ? "available" : "taken";
}

const availabilityErrors: Record<Availability, string> = {
	idle: "Please choose an available handle.",
	checking: "Please wait until your handle is checked.",
	available: "",
	taken: "Please choose an available handle.",
	invalid: "Please choose a valid handle.",
};

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
	const availability = getAvailability({
		currentHandle,
		debouncedHandle,
		isInitialHandle,
		isCheckError: isHandleCheckError,
		isFetching: isHandleCheckFetching,
		isPending: isHandleCheckPending,
		handleCheck,
	});

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
			setError(availabilityErrors[availability]);
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
