"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@grabbin/ui/components/alert-dialog";
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
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "reicon-react/icons/Trash2";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getPageImageUrl } from "@/lib/page-image-url";
import { PlanDialog } from "../../billing/plan-dialog";
import CreatePageForm from "./create-page-form";

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
	const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
	const [busyHandle, setBusyHandle] = useState<string | null>(null);
	const [deletePageHandle, setDeletePageHandle] = useState<string | null>(null);
	useEffect(() => {
		if (active) return;
		setActivity("manage");
	}, [active]);
	const pagesQuery = useQuery({
		queryKey: ["owned-pages"],
		queryFn: async () => {
			const response = await apiClient.pages.owned.$get();
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			const result = await response.json();
			if (!("pages" in result)) throw new Error("Could not load your pages.");
			return result;
		},
		enabled: active,
	});

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
			const response = await apiClient.pages[":handle"].primary.$patch({
				param: { handle },
			});
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			await pagesQuery.refetch();
		} catch (error) {
			toast({
				message: error instanceof Error ? error.message : "Please try again.",
				state: "error",
			});
		} finally {
			setBusyHandle(null);
		}
	};

	const confirmDeletePage = async () => {
		if (!deletePageHandle) return;
		const handle = deletePageHandle;
		setBusyHandle(handle);
		try {
			const response = await apiClient.pages[":handle"].$delete({
				param: { handle },
			});
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			await pagesQuery.refetch();
			setDeletePageHandle(null);
		} catch (error) {
			toast({
				message: error instanceof Error ? error.message : "Please try again.",
				state: "error",
			});
		} finally {
			setBusyHandle(null);
		}
	};

	const requestPrimaryChange = (handle: string) => {
		if (pagesQuery.data?.plan.hasAccess) void changePrimary(handle);
		else {
			setIsPlanDialogOpen(true);
		}
	};

	const startAddingPage = () => {
		if (pagesQuery.data?.plan.hasAccess) {
			setActivity("create");
		} else {
			setIsPlanDialogOpen(true);
		}
	};

	const content = (
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
															onClick={() => setDeletePageHandle(page.handle)}
														>
															<Trash2 aria-hidden="true" className="size-4" />
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

	return (
		<>
			{content}
			<AlertDialog
				open={deletePageHandle !== null}
				onOpenChange={(nextOpen) => {
					if (!nextOpen && busyHandle === null) setDeletePageHandle(null);
				}}
			>
				<AlertDialogContent
					overlayProps={{ forceRender: true, className: "z-[60]" }}
					className="z-[70] gap-0 overflow-hidden p-5"
				>
					<div className="flex h-full w-full min-w-0 flex-col gap-4">
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this page?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete{" "}
								<span className="font-medium text-primary">
									/{deletePageHandle}
								</span>{" "}
								and its content. This action can&apos;t be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="mx-0 mt-auto w-full! flex-col-reverse! items-end rounded-b-xl border-0 bg-transparent px-0 sm:justify-end">
							<AlertDialogCancel
								className="w-full min-w-0 whitespace-nowrap sm:max-w-36"
								size="xl"
								variant="outline"
								disabled={busyHandle !== null}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								size="xl"
								disabled={busyHandle !== null}
								onClick={() => void confirmDeletePage()}
								className="relative w-full min-w-0 overflow-hidden whitespace-nowrap bg-destructive text-white hover:bg-destructive/80 motion-safe:active:scale-100 sm:max-w-36"
							>
								{busyHandle !== null && busyHandle === deletePageHandle
									? "Deleting…"
									: "Delete page"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</div>
				</AlertDialogContent>
			</AlertDialog>
			<PlanDialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen} />
		</>
	);
}
