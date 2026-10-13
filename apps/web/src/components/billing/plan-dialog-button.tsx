import { Button } from "@grabbin/ui/components/button";
import { openPlanDialog } from "./plan-picker";

export function PlanDialogButton({
	children = "Get Pro",
	...buttonProps
}: React.ComponentProps<typeof Button>) {
	return (
		<Button {...buttonProps} onClick={openPlanDialog}>
			{children}
		</Button>
	);
}
