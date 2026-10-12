import { toast } from "@grabbin/ui/components/toast";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/error-message";

export function useBillingPortal() {
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);

	const openBillingPortal = async () => {
		setIsOpeningPortal(true);
		try {
			const { data, error } = await authClient.creem.createPortal();
			if (error) throw new Error(error.message);
			if (data?.url) window.location.assign(data.url);
			else throw new Error("Could not open the plan portal. Please try again.");
		} catch (error) {
			toast({
				message: getErrorMessage(
					error,
					"Could not open the plan portal. Please try again.",
				),
				state: "error",
			});
			setIsOpeningPortal(false);
		}
	};

	return { isOpeningPortal, openBillingPortal };
}
