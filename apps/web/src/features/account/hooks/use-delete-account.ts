import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";

type DeleteActivity = "confirm" | "sent";

export function useDeleteAccount(open: boolean) {
	const reduceMotion = useReducedMotion();
	const [activity, setActivity] = useState<DeleteActivity>("confirm");
	const [clickCount, setClickCount] = useState(0);
	const [isRequesting, setIsRequesting] = useState(false);
	const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const reset = useCallback(() => {
		setActivity("confirm");
		setClickCount(0);
		setIsRequesting(false);
	}, []);

	useEffect(() => {
		if (!open) return;
		reset();
	}, [open, reset]);

	useEffect(() => {
		return () => {
			if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
		};
	}, []);

	const handleOpenChange = (nextOpen: boolean) => {
		if (resetTimerRef.current) {
			clearTimeout(resetTimerRef.current);
			resetTimerRef.current = null;
		}

		if (nextOpen) return;

		setIsRequesting(false);
		resetTimerRef.current = setTimeout(reset, reduceMotion ? 0 : 150);
	};

	const handleDeleteAccount = async () => {
		const nextClickCount = clickCount + 1;
		setClickCount(nextClickCount);
		if (nextClickCount < 4) return;

		setIsRequesting(true);
		const { error } = await authClient.deleteUser({
			callbackURL: window.location.origin,
		});
		setIsRequesting(false);

		if (error) return getAuthErrorMessage(error);

		setActivity("sent");
	};

	return {
		activity,
		clickCount,
		handleDeleteAccount,
		handleOpenChange,
		isRequesting,
	};
}
