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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@grabbin/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@grabbin/ui/components/drawer";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useIsMobile } from "@grabbin/ui/components/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Verified } from "reicon-react/icons/Verified";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { getPageImageUrl } from "@/lib/page-image-url";
import { PlanDialog } from "../../billing/plan-dialog";
import CreatePageForm from "./create-page-form";

type Activity = "manage" | "create";

export default function ManagePagesDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const isMobile = useIsMobile();
	const reduceMotion = useReducedMotion() ?? false;
	const [activity, setActivity] = useState<Activity>("manage");
	const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
	const [busyHandle, setBusyHandle] = useState<string | null>(null);
	const [revealedHandle, setRevealedHandle] = useState<string | null>(null);
	const [deletePageHandle, setDeletePageHandle] = useState<string | null>(null);
	const didDragRef = useRef(false);
	useEffect(() => {
		if (open) return;
		setActivity("manage");
		setRevealedHandle(null);
		didDragRef.current = false;
	}, [open]);
	const pagesQuery = useQuery({
		queryKey: ["owned-pages"],
		queryFn: async () => {
			const response = await apiClient.pages.owned.$get();
			if (!response.ok) throw new Error(await getApiErrorMessage(response));
			const result = await response.json();
			if (!("pages" in result)) throw new Error("Could not load your pages.");
			return result;
		},
		enabled: open,
	});

	const backToManage = () => {
		setRevealedHandle(null);
		didDragRef.current = false;
		setActivity("manage");
		void pagesQuery.refetch();
	};

	const choosePage = (handle: string) => {
		onOpenChange(false);
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
			toast({ message: "Primary page updated.", state: "success" });
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
			setRevealedHandle(null);
			toast({ message: "Page deleted.", state: "success" });
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
			setRevealedHandle(null);
			didDragRef.current = false;
			setActivity("create");
		} else {
			setIsPlanDialogOpen(true);
		}
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) setActivity("manage");
		onOpenChange(nextOpen);
	};

	const content = (
		<div
			className={
				isMobile
					? "flex h-full min-h-0 min-w-0 flex-col overflow-y-auto p-5"
					: "flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-0"
			}
		>
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
									: "flex h-full min-w-0 flex-col justify-between p-1"
							}
						>
							{isMobile ? (
								<DrawerHeader className="flex-row items-center justify-between gap-3 p-0 text-left">
									<DrawerTitle>Manage pages</DrawerTitle>
									{pagesQuery.data && (
										<DrawerDescription className="smooth-shadow-ring-xs m-0 flex items-center gap-1 rounded-md px-2 py-1 font-medium text-primary text-sm">
											{pagesQuery.data.plan.hasAccess ? (
												<span className="flex items-center gap-1">
													<Verified
														aria-hidden="true"
														weight="Filled"
														className="size-4 text-brand-blue"
													/>
													Pro
												</span>
											) : (
												"Free"
											)}
										</DrawerDescription>
									)}
								</DrawerHeader>
							) : (
								<DialogHeader className="flex-row items-center justify-between gap-3">
									<DialogTitle>Manage pages</DialogTitle>
									{pagesQuery.data && (
										<DialogDescription className="smooth-shadow-ring-xs m-0 flex items-center gap-1 rounded-md px-2 py-1 font-medium text-primary text-sm">
											{pagesQuery.data.plan.hasAccess ? (
												<span className="flex items-center gap-1">
													<Verified
														aria-hidden="true"
														weight="Filled"
														className="size-4 text-brand-blue"
													/>
													Pro
												</span>
											) : (
												"Free"
											)}
										</DialogDescription>
									)}
								</DialogHeader>
							)}
							<div
								className={
									isMobile
										? "flex max-h-[60dvh] flex-col items-center gap-1 overflow-y-auto rounded-3xl"
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
											className="relative w-full overflow-hidden rounded-xl"
										>
											<motion.div
												onPointerDownCapture={() => {
													didDragRef.current = false;
												}}
												onClickCapture={(event) => {
													if (!didDragRef.current) return;
													if (event.detail === 0) {
														didDragRef.current = false;
														return;
													}
													event.preventDefault();
													event.stopPropagation();
													didDragRef.current = false;
												}}
												drag="x"
												dragDirectionLock
												dragConstraints={{ left: -48, right: 0 }}
												dragMomentum={false}
												animate={{
													x: revealedHandle === page.handle ? -48 : 0,
												}}
												transition={
													reduceMotion
														? { duration: 0 }
														: { type: "spring", duration: 0.3, bounce: 0 }
												}
												onDragStart={() => {
													didDragRef.current = true;
													if (revealedHandle !== page.handle) {
														setRevealedHandle(null);
													}
												}}
												onDragEnd={(_, info) => {
													const isRevealed = revealedHandle === page.handle;
													const shouldReveal = isRevealed
														? info.offset.x <= 24 && info.velocity.x < 500
														: info.offset.x <= -24 || info.velocity.x <= -500;
													setRevealedHandle(shouldReveal ? page.handle : null);
												}}
												className={`relative z-10 flex min-h-12 w-full touch-pan-y items-center gap-2 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-secondary motion-reduce:transition-none ${revealedHandle === page.handle ? "bg-muted/80" : "bg-popover"}`}
											>
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
													className="size-6 cursor-pointer rounded-full border border-muted-foreground/30 data-checked:border-2 data-checked:border-brand-green! data-checked:bg-brand-green! data-checked:text-white! data-checked:outline-depth"
													disabled={busyHandle !== null}
													onCheckedChange={(checked) => {
														if (checked) requestPrimaryChange(page.handle);
													}}
												/>
											</motion.div>
											<Button
												variant="ghost"
												aria-label={`Delete /${page.handle}`}
												className="absolute top-1/2 right-0 z-0 grid h-9! w-9! min-w-0 shrink-0 -translate-y-1/2 place-items-center rounded-full bg-destructive p-0 text-white outline-depth -outline-offset-2! hover:bg-destructive/80 hover:text-white"
												disabled={busyHandle !== null}
												onClick={() => setDeletePageHandle(page.handle)}
												onFocus={(event) => {
													if (
														event.currentTarget.matches(":focus-visible") &&
														!(
															event.relatedTarget instanceof HTMLElement &&
															event.relatedTarget.closest(
																'[data-slot="alert-dialog-content"]',
															)
														)
													) {
														setRevealedHandle(page.handle);
													}
												}}
											>
												<Trash aria-hidden="true" className="size-5" />
											</Button>
										</div>
									))
								)}
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
			{isMobile ? (
				<Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
					<DrawerContent className="h-fit! max-h-[calc(100dvh-2rem)]">
						{content}
					</DrawerContent>
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={handleOpenChange}>
					<DialogContent
						showCloseButton={false}
						className="smooth-shadow-md aspect-square gap-0 overflow-hidden p-5 ring-0"
					>
						{content}
					</DialogContent>
				</Dialog>
			)}
			<AlertDialog
				open={deletePageHandle !== null}
				onOpenChange={(nextOpen) => {
					if (!nextOpen && busyHandle === null) setDeletePageHandle(null);
				}}
			>
				<AlertDialogContent className="aspect-square gap-0 overflow-hidden p-5">
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
