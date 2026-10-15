"use client";

import { Button } from "@grabbin/ui/components/button";
import { Input } from "@grabbin/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grabbin/ui/components/popover";
import { cn } from "@grabbin/ui/lib/utils";
import { Link2, RefreshCw, Unlink } from "lucide-react";
import {
	type ClipboardEvent,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useEmailOtpShake } from "@/hooks/use-email-otp-shake";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

import "@grabbin/ui/styles/email-otp-form.css";

export default function LinkControl({
	value,
	onCommit,
	onRefresh,
	isRefreshing = false,
	ariaLabel,
	allowEmpty = true,
	inputBackground = "bg-black/25",
}: {
	value: string;
	onCommit: (value: string) => void;
	onRefresh?: () => void | Promise<void>;
	isRefreshing?: boolean;
	ariaLabel: string;
	allowEmpty?: boolean;
	inputBackground?: string;
}) {
	const [open, setOpen] = useState(false);
	const [draftUrl, setDraftUrl] = useState(value);
	const [linkError, setLinkError] = useState(false);
	const [shakeKey, setShakeKey] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const invalidRef = useRef(false);
	const shakeRef = useEmailOtpShake(shakeKey);
	const hasUrl = value.trim().length > 0;

	useEffect(() => {
		setDraftUrl(value);
	}, [value]);

	useEffect(() => {
		if (!open) return;
		const frame = requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.setSelectionRange(draftUrl.length, draftUrl.length);
		});
		return () => cancelAnimationFrame(frame);
	}, [draftUrl.length, open]);

	const markInvalid = () => {
		invalidRef.current = true;
		setLinkError(true);
		setShakeKey((key) => key + 1);
		requestAnimationFrame(() => {
			const input = inputRef.current;
			if (!input) return;
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		});
	};
	const commitDraftUrl = (rawValue: string) => {
		const valueToCommit = rawValue.trim();
		if (!valueToCommit && allowEmpty) {
			invalidRef.current = false;
			setLinkError(false);
			onCommit("");
			return;
		}

		const normalizedUrl = normalizeHttpsUrl(valueToCommit);
		if (!normalizedUrl) {
			markInvalid();
			return;
		}

		invalidRef.current = false;
		setLinkError(false);
		setDraftUrl(normalizedUrl);
		onCommit(normalizedUrl);
	};
	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") event.currentTarget.blur();
		if (event.key === "Escape") {
			event.preventDefault();
			invalidRef.current = false;
			setLinkError(false);
			setDraftUrl(value);
			setOpen(false);
		}
	};
	const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
		const pastedValue = event.clipboardData.getData("text");
		if (!pastedValue) return;

		event.preventDefault();
		const input = event.currentTarget;
		const start = input.selectionStart ?? draftUrl.length;
		const end = input.selectionEnd ?? draftUrl.length;
		const nextValue = `${draftUrl.slice(0, start)}${pastedValue}${draftUrl.slice(end)}`;
		setDraftUrl(nextValue);
		commitDraftUrl(nextValue);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && invalidRef.current) return;
				setOpen(nextOpen);
			}}
		>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={open}
						aria-label={ariaLabel}
						className={cn(
							"size-8! cursor-pointer! rounded-md! bg-transparent p-0 text-primary-foreground shadow-none hover:bg-primary-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60",
							hasUrl && "!bg-green-400 !text-white hover:!bg-green-400",
						)}
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				{hasUrl ? (
					<Link2 className="size-5 -rotate-z-45 stroke-[2.5px]" />
				) : (
					<Unlink className="size-4 stroke-[2.5px]" />
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				side="bottom"
				sideOffset={10}
				positionerClassName="z-[100003]"
				className="grid-action z-50 flex h-10 w-64 flex-row items-center gap-1 rounded-[0.45rem] border-0 bg-foreground/95 p-1 shadow-lg ring-0 backdrop-blur-sm [--smooth-ring-width:0px]"
			>
				<div
					ref={shakeRef}
					className={cn("t-input min-w-0 flex-1", linkError && "is-error")}
				>
					<Input
						ref={inputRef}
						aria-label="Link URL"
						aria-invalid={linkError}
						value={draftUrl}
						placeholder="Add link..."
						className={`h-8 w-full border-0 ${inputBackground} text-primary-foreground placeholder:text-primary-foreground/45 hover:border-white/10 focus-visible:border-white/10 focus-visible:ring-0`}
						onChange={(event) => {
							setDraftUrl(event.target.value);
							invalidRef.current = false;
							setLinkError(false);
						}}
						onPaste={handlePaste}
						onBlur={() => commitDraftUrl(draftUrl)}
						onKeyDown={handleKeyDown}
						autoComplete="url"
						inputMode="url"
					/>
				</div>
				{onRefresh ? (
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="Refresh link metadata"
						title="Refresh link metadata"
						disabled={isRefreshing}
						className="size-8 shrink-0 cursor-pointer! rounded-md text-primary-foreground hover:bg-primary-foreground hover:text-primary"
						onClick={() => void onRefresh()}
					>
						<RefreshCw
							className={
								isRefreshing
									? "size-4 animate-spin stroke-[2.5px]"
									: "size-4 stroke-[2.5px]"
							}
						/>
					</Button>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
