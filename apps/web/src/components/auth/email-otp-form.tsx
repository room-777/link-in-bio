"use client";

import { Button } from "@grabbin/ui/components/button";
import { Field, FieldError, FieldGroup } from "@grabbin/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { useState } from "react";

import { authClient, getAuthErrorMessage } from "@/lib/auth-client";

import "@grabbin/ui/styles/email-otp-form.css";
import { useEmailOtpShake } from "../../hooks/use-email-otp-shake";

type EmailOtpFormProps = {
	onOtpSent: (email: string) => void;
};

export default function EmailOtpForm({ onOtpSent }: EmailOtpFormProps) {
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [shakeKey, setShakeKey] = useState(0);
	const emailInputRef = useEmailOtpShake(shakeKey);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;

		if (!form.checkValidity()) {
			setEmailError("Please enter a valid email address.");
			setShakeKey((key) => key + 1);
			return;
		}

		setEmailError("");
		setIsSending(true);
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		setIsSending(false);

		if (error) {
			setEmailError(getAuthErrorMessage(error));
			setShakeKey((key) => key + 1);
			return;
		}

		onOtpSent(email);
	};

	return (
		<form noValidate onSubmit={handleSubmit} className="w-full">
			<FieldGroup>
				<Field
					data-invalid={!!emailError}
					className={emailError ? "is-error t-input-wrap" : "t-input-wrap"}
				>
					<InputGroup
						ref={emailInputRef}
						className={emailError ? "is-error t-input h-12" : "t-input h-12"}
					>
						<InputGroupInput
							id="email"
							name="email"
							type="email"
							required
							placeholder="Email"
							value={email}
							onChange={(event) => {
								setEmail(event.target.value);
								setEmailError("");
							}}
							aria-invalid={!!emailError}
							className="h-12"
						/>
						<InputGroupAddon align="inline-end">
							<Button
								type="submit"
								variant="outline"
								className="relative h-10 rounded-md text-primary hover:bg-background"
								disabled={isSending}
							>
								{isSending && (
									<span className="absolute inset-0 grid place-items-center">
										<Loading />
									</span>
								)}
								<span className={isSending ? "opacity-0" : undefined}>
									Send OTP
								</span>
							</Button>
						</InputGroupAddon>
					</InputGroup>
					<div className="t-error-msg min-h-5" aria-live="polite">
						<FieldError className="text-xs">{emailError}</FieldError>
					</div>
				</Field>
			</FieldGroup>
		</form>
	);
}
