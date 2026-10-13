import { Button } from "@grabbin/ui/components/button";
import { openPlanDialog as handleOpenPlanDialog } from "./plan-picker";

export function PlanDialogButton({
	children = "Get Pro",
	...buttonProps
}: React.ComponentProps<typeof Button>) {
	return (
		<Button {...buttonProps} onClick={handleOpenPlanDialog}>
			{children}
		</Button>
	);
}
