"use client";

import { Button } from "@grabbin/ui/components/button";
import { Field, FieldError } from "@grabbin/ui/components/field";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@grabbin/ui/components/input-otp";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { useEffect, useState } from "react";
import { CheckCircle } from "reicon-react/icons/CheckCircle";

import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";

type EmailOtpVerificationFormProps = {
	email: string;
	returnTo?: string | null;
	onUseDifferentEmail: () => void;
};

export default function EmailOtpVerificationForm({
	email,
	returnTo,
	onUseDifferentEmail,
}: EmailOtpVerificationFormProps) {
	const [otp, setOtp] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isSigningIn, setIsSigningIn] = useState(false);
	const [isShown, setIsShown] = useState(false);

	useEffect(() => {
		setIsShown(true);
	}, []);

	const sendCode = async () => {
		setErrorMessage("");
		setIsSending(true);
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setIsSending(false);

		if (error) {
			const message = getAuthErrorMessage(error);
			setErrorMessage(message);
			toast({ message, state: "error" });
			return;
		}
	};

	const verifyCode = async () => {
		setErrorMessage("");
		setIsSigningIn(true);
		const { error } = await authClient.signIn.emailOtp({
			email,
			otp,
		});
		setIsSigningIn(false);

		if (error) {
			setErrorMessage(getAuthErrorMessage(error));
			return;
		}
		window.location.replace(getSignInHref(returnTo));
	};

	return (
		<div className="grid w-full gap-4">
			<header
				className={`t-stagger mb-4 flex w-full flex-col gap-0.5 ${isShown ? "is-shown" : ""}`}
			>
				<span
					className="t-success-check mb-2 self-start"
					data-state="in"
					aria-hidden="true"
				>
					<CheckCircle weight="Filled" className="size-12 text-brand-green" />
				</span>
				<h1 className="t-stagger-line t-stagger-line--1 font-medium text-xl">
					Check your inbox
				</h1>
				<p className="t-stagger-line t-stagger-line--2 text-balance text-muted-foreground text-sm">
					We sent a verification code to{" "}
					<strong className="font-medium text-primary">{email}</strong>.
				</p>
				<p className="t-stagger-line t-stagger-line--3 text-wrap text-muted-foreground text-sm">
					It expires in 5 minutes.
				</p>
			</header>
			<div className="flex w-full flex-col gap-2">
				<Field data-invalid={!!errorMessage}>
					<div className="flex w-full min-w-0">
						<InputOTP
							id="email-otp"
							maxLength={6}
							value={otp}
							aria-invalid={!!errorMessage}
							onChange={(value) => {
								setOtp(value);
								setErrorMessage("");
							}}
							containerClassName="w-full min-w-0"
						>
							<InputOTPGroup>
								{Array.from({ length: 6 }, (_, index) => (
									<InputOTPSlot key={index} index={index} />
								))}
							</InputOTPGroup>
						</InputOTP>
					</div>
					<div className="min-h-5" aria-live="polite">
						<FieldError className="text-xs">{errorMessage}</FieldError>
					</div>
				</Field>
				<Button
					variant="default"
					disabled={isSigningIn || otp.length !== 6}
					onClick={verifyCode}
					className="h-12"
				>
					{isSigningIn ? <Loading /> : "Verify code"}
				</Button>
				<div className="flex w-full flex-col items-center gap-2">
					<Button
						variant="outline"
						disabled={isSending}
						onClick={sendCode}
						className="h-12 w-full"
					>
						{isSending ? <Loading /> : "Resend code"}
					</Button>
					<Button
						variant="link"
						onClick={onUseDifferentEmail}
						className="min-h-9 px-2 font-normal text-muted-foreground/50 text-xs"
					>
						Use a different email
					</Button>
				</div>
			</div>
		</div>
	);
}
