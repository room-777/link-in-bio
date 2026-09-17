"use client";

import { Button } from "@grabbin/ui/components/button";
import { Activity, useState } from "react";
import { toast } from "sonner";

import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import EmailOtpForm from "./email-otp-form";
import EmailOtpVerificationForm from "./email-otp-verification-form";

type SocialProvider = "google" | "github" | "twitter";

export default function LoginForm() {
	const [otpEmail, setOtpEmail] = useState<string | null>(null);

	const handleSocialSignIn = async (provider: SocialProvider) => {
		const { error } = await authClient.signIn.social({
			provider,
			callbackURL: window.location.origin,
			newUserCallbackURL: `${window.location.origin}/create`,
		});

		if (error) {
			toast.error(getAuthErrorMessage(error));
		}
	};

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-sm flex-col items-center justify-center p-6">
			<Activity mode={otpEmail ? "hidden" : "visible"}>
				<header className="mb-8 flex w-full flex-col gap-0.5">
					<h1 className="font-medium text-xl">Good to see you again.</h1>
					<p className="text-muted-foreground text-sm">
						Create your account for free
					</p>
				</header>

				<EmailOtpForm onOtpSent={setOtpEmail} />

				<div className="mb-6 text-muted-foreground/60 text-sm">or</div>

				<div className="w-full space-y-2">
					<Button
						type="button"
						size={"xl"}
						variant="outline"
						className="h-11 w-full"
						onClick={() => handleSocialSignIn("google")}
					>
						<img
							src="https://cdn.reicon.dev/logos/google/original.svg"
							alt="Google"
							width={16}
							height={16}
						/>
						Continue with Google
					</Button>
					<Button
						type="button"
						size={"xl"}
						variant="default"
						className="h-11 w-full"
						onClick={() => handleSocialSignIn("twitter")}
					>
						<img
							src="https://cdn.reicon.dev/logos/x-formerly-twitter/original.svg"
							alt="X Formerly Twitter"
							width={16}
							height={16}
						/>
						Continue with X
					</Button>
				</div>
			</Activity>
			<Activity mode={otpEmail ? "visible" : "hidden"}>
				{otpEmail && (
					<EmailOtpVerificationForm
						email={otpEmail}
						onUseDifferentEmail={() => setOtpEmail(null)}
					/>
				)}
			</Activity>
		</div>
	);
}
