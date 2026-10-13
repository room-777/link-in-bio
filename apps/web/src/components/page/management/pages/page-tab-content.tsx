"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@grabbin/ui/components/avatar";
import { Button } from "@grabbin/ui/components/button";
import { Checkbox } from "@grabbin/ui/components/checkbox";
import { DialogHeader, DialogTitle } from "@grabbin/ui/components/dialog";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { overlay } from "overlay-kit";
import { useEffect, useState } from "react";
import { Trash } from "@/components/trash";
import { getErrorMessage } from "@/lib/error-message";
import { getPageImageUrl } from "@/lib/page-image-url";
import { useChangePrimaryPage } from "@/mutation/page/change-primary";
import { useDeletePage } from "@/mutation/page/delete";
import { useOwnedPagesQuery } from "@/query/page/owned-pages";
import { openPlanDialog } from "../../../billing/plan-dialog";
import CreatePageForm from "./create-page-form";
import DeletePageDialog from "./delete-page-dialog";

type Activity = "manage" | "create";

export default function PageTabContent({
	active,
	onClose,
}: {
	active: boolean;
	onClose: () => void;
}) {
	const router = useRouter();
	const isMobile = useIsMobile();
	const reduceMotion = useReducedMotion() ?? false;
	const [activity, setActivity] = useState<Activity>("manage");
	const [busyHandle, setBusyHandle] = useState<string | null>(null);
	const pagesQuery = useOwnedPagesQuery(active);
	const changePrimaryMutation = useChangePrimaryPage();
	const deletePageMutation = useDeletePage();
	useEffect(() => {
		if (active) return;
		setActivity("manage");
	}, [active]);

	const backToManage = () => {
		setActivity("manage");
		void pagesQuery.refetch();
	};

	const choosePage = (handle: string) => {
		onClose();
		router.push(`/${encodeURIComponent(handle)}`);
	};

	const changePrimary = async (handle: string) => {
		setBusyHandle(handle);
		try {
			await changePrimaryMutation.mutateAsync(handle);
		} catch (error) {
			toast({
				message: getErrorMessage(error, "Please try again."),
				state: "error",
			});
		} finally {
			setBusyHandle(null);
		}
	};

	const confirmDeletePage = async (handle: string) => {
		setBusyHandle(handle);
		try {
			await deletePageMutation.mutateAsync(handle);
			return true;
		} catch (error) {
			toast({
				message: getErrorMessage(error, "Please try again."),
				state: "error",
			});
			return false;
		} finally {
			setBusyHandle(null);
		}
	};

	const requestDeletePage = (handle: string) => {
		overlay.open(({ isOpen, close, unmount }) => (
			<DeletePageDialog
				handle={handle}
				open={isOpen}
				close={close}
				unmount={unmount}
				onConfirm={() => confirmDeletePage(handle)}
			/>
		));
	};

	const requestPrimaryChange = (handle: string) => {
		if (pagesQuery.data?.plan.hasAccess) void changePrimary(handle);
		else {
			openPlanDialog();
		}
	};

	const startAddingPage = () => {
		if (pagesQuery.data?.plan.hasAccess) {
			setActivity("create");
		} else {
			openPlanDialog();
		}
	};

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col p-1">
			<AnimatePresence initial={false} mode="wait">
				<motion.div
					key={activity}
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
					transition={
						reduceMotion
							? { duration: 0 }
							: { duration: 0.28, ease: [0.23, 1, 0.32, 1] }
					}
					className={isMobile ? "min-h-0 min-w-0" : "h-full min-h-0 min-w-0"}
				>
					{activity === "create" ? (
						<CreatePageForm
							presentation="dialog"
							onComplete={choosePage}
							onBack={backToManage}
						/>
					) : (
						<div
							className={
								isMobile
									? "flex min-w-0 flex-col gap-4"
									: "flex h-full min-w-0 flex-col justify-between gap-4"
							}
						>
							<div className="flex flex-col gap-4">
								<DialogHeader>
									<DialogTitle>Manage pages</DialogTitle>
								</DialogHeader>
								<div
									className={
										isMobile
											? "flex flex-col items-center gap-1"
											: "flex flex-col items-center gap-1 rounded-3xl"
									}
								>
									{pagesQuery.isPending ? (
										<p role="status" className="py-4">
											<Loading />
										</p>
									) : pagesQuery.isError ? (
										<div className="grid gap-2 py-2">
											<p role="alert">Could not load your pages.</p>
											<Button
												variant="outline"
												onClick={() => void pagesQuery.refetch()}
											>
												Try again
											</Button>
										</div>
									) : (
										pagesQuery.data?.pages.map((page) => (
											<div
												key={page.id}
												className="-mx-3 self-stretch rounded-xl"
											>
												<div className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-popover px-3 py-3 transition-colors duration-150 hover:bg-secondary motion-reduce:transition-none">
													<Avatar size="lg" className="size-10 outline-depth">
														<AvatarImage
															src={
																getPageImageUrl(page.imageKey, {
																	width: 80,
																	height: 80,
																}) ?? undefined
															}
															alt=""
														/>
														<AvatarFallback />
													</Avatar>
													<Button
														variant="ghost"
														className="h-auto min-w-0 grow justify-start px-0 py-0 text-left hover:bg-transparent"
														onClick={() => choosePage(page.handle)}
													>
														<span className="grid min-w-0 gap-0.5">
															<span className="truncate font-medium">
																{page.name || `${page.handle}`}
															</span>
															<span className="truncate text-muted-foreground text-sm">
																@{page.handle}
															</span>
														</span>
													</Button>
													<Checkbox
														checked={page.isPrimary}
														aria-label={`Set /${page.handle} as primary page`}
														className="size-6 cursor-pointer rounded-full border border-muted-foreground/30 data-checked:border-0 data-checked:bg-brand-green! data-checked:text-white!"
														disabled={busyHandle !== null}
														onCheckedChange={(checked) => {
															if (checked) requestPrimaryChange(page.handle);
														}}
													/>
													{!page.isPrimary && (
														<Button
															variant="ghost"
															size="icon-xs"
															aria-label={`Delete /${page.handle}`}
															className="size-6! min-w-0 rounded-full border-0 bg-destructive p-0 text-white hover:bg-destructive/80 hover:text-white"
															disabled={busyHandle !== null}
															onClick={() => requestDeletePage(page.handle)}
														>
															<Trash aria-hidden="true" className="size-4" />
														</Button>
													)}
												</div>
											</div>
										))
									)}
								</div>
							</div>
							<div className="flex justify-center">
								<Button
									aria-label="Add page"
									className="relative after:absolute after:-inset-1"
									variant="secondary"
									disabled={
										!pagesQuery.data ||
										(pagesQuery.data.plan.hasAccess &&
											pagesQuery.data.pages.length >=
												pagesQuery.data.plan.pageLimit)
									}
									onClick={startAddingPage}
								>
									<Plus
										aria-hidden="true"
										className="size-4 text-muted-foreground/80"
									/>
									{pagesQuery.data && (
										<span className="text-muted-foreground/80 text-sm">
											{pagesQuery.data.pages.length} of{" "}
											{pagesQuery.data.plan.hasAccess
												? pagesQuery.data.plan.pageLimit
												: 1}
										</span>
									)}
								</Button>
							</div>
						</div>
					)}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
