"use client";

import { AnimatedTooltip } from "@grabbin/ui/components/animated-tooltip";
import { Button } from "@grabbin/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { Separator } from "@grabbin/ui/components/separator";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openChangeHandleDialog } from "@/features/page/management/pages";
import { usePublicViews } from "@/hooks/use-public-views";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { openDeleteAccountDialog } from "../management/account/open-delete-account-dialog";
import { openSettingDialog } from "../management/settings/open-setting-dialog";
import { openShareLinkDialog } from "../sharing/share-link-dialog";
import {
	getDiscordTooltipControl,
	getShareTooltipControl,
} from "./page-footer-tooltip-controls";
import { getPublicViewsTooltipControl } from "./public-views-tooltip";

export default function OwnerFooter({
	handle,
	onHandleChange,
	profileImageUrl,
	isAutoSaving,
}: {
	handle?: string;
	onHandleChange?: (handle: string) => void;
	profileImageUrl: string | null;
	isAutoSaving: boolean;
}) {
	const router = useRouter();
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const viewsTooltip = getPublicViewsTooltipControl(usePublicViews(handle));

	async function handleSignOut() {
		setIsSigningOut(true);
		const { error } = await authClient.signOut();
		if (error) {
			setIsSigningOut(false);
			toast({ message: getAuthErrorMessage(error), state: "error" });
			return;
		}

		router.refresh();
	}

	return (
		<>
			<div className="flex items-center gap-1">
				<Popover
					open={isOpen}
					onOpenChange={(open) => {
						setIsOpen(open);
					}}
				>
					<AnimatedTooltip
						className="bg-background text-muted-foreground"
						controls={[
							{
								id: "setting",
								content: "Setting",
								trigger: (
									<PopoverTrigger
										render={
											<Button
												variant="ghost"
												size="icon-lg"
												className="text-muted-foreground/80"
												aria-label="Open page options"
											>
												<SlidersHorizontal className="stroke-[2.5px]" />
											</Button>
										}
									/>
								),
							},
							getDiscordTooltipControl(),
							viewsTooltip,
							getShareTooltipControl(
								() => openShareLinkDialog(profileImageUrl, isMobile),
								isAutoSaving,
							),
						].filter((control) => control !== null)}
					/>
					<PopoverContent
						align="start"
						side="top"
						sideOffset={8}
						initialFocus={false}
						className="smooth-shadow-ring-md w-60 items-center gap-1 rounded-3xl p-2"
					>
						<PopoverTitle className="sr-only">Page options</PopoverTitle>
						<Button
							variant="ghost"
							className="h-16 w-full justify-start px-3"
							onClick={() => {
								setIsOpen(false);
								openChangeHandleDialog(handle, onHandleChange, isMobile);
							}}
						>
							<span className="flex flex-col items-start gap-0.5 text-left">
								<span>Change handle</span>
								<span className="w-full min-w-0 break-all text-muted-foreground/80 text-sm">
									{handle ? `/${handle}` : null}
								</span>
							</span>
						</Button>
						<Separator
							orientation="horizontal"
							className="rounded-full bg-secondary data-horizontal:mx-3 data-horizontal:h-[1.5px] data-horizontal:w-[calc(100%-1.5rem)]!"
						/>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3"
							onClick={() => {
								setIsOpen(false);
								openSettingDialog(handle);
							}}
						>
							Setting
						</Button>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3"
							disabled={isSigningOut}
							onClick={handleSignOut}
						>
							{isSigningOut ? "Logging out..." : "Log Out"}
						</Button>
						<Button
							variant="ghost"
							className="h-12 w-full justify-start px-3 text-primary"
							onClick={() => {
								setIsOpen(false);
								openDeleteAccountDialog();
							}}
						>
							Delete account
						</Button>
					</PopoverContent>
				</Popover>
			</div>
		</>
	);
}
