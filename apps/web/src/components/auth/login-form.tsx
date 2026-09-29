"use client";

import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { Activity, useState } from "react";
import Logo from "@/components/logo";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import EmailOtpForm from "./email-otp-form";
import EmailOtpVerificationForm from "./email-otp-verification-form";

type SocialProvider = "google" | "github" | "twitter";

export default function LoginForm({ returnTo }: { returnTo?: string | null }) {
	const [otpEmail, setOtpEmail] = useState<string | null>(null);
	const [socialLoginProvider, setSocialLoginProvider] =
		useState<SocialProvider | null>(null);
	const signInHref = getSignInHref(returnTo);

	const handleSocialSignIn = async (provider: SocialProvider) => {
		setSocialLoginProvider(provider);
		const webOrigin = window.location.origin;
		try {
			const { error } = await authClient.signIn.social({
				provider,
				callbackURL: new URL(signInHref, webOrigin).toString(),
				newUserCallbackURL: new URL("/create", webOrigin).toString(),
			});

			if (error) {
				setSocialLoginProvider(null);
				toast({ message: getAuthErrorMessage(error), state: "error" });
			}
		} catch {
			setSocialLoginProvider(null);
			toast({
				message: "Unable to reach the sign-in service. Please try again.",
				state: "error",
			});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center p-6 lg:min-h-svh">
			<Activity mode={otpEmail ? "hidden" : "visible"}>
				<header className="mb-8 flex w-full flex-col gap-0.5">
					<Logo className="mb-6 size-10 self-center" />
					<h1 className="font-medium text-xl">Good to see you again.</h1>
					<p className="text-muted-foreground text-sm">
						Create your page in seconds
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
						disabled={socialLoginProvider !== null}
						onClick={() => handleSocialSignIn("google")}
					>
						{socialLoginProvider === "google" ? (
							<Loading />
						) : (
							<>
								<img
									src="https://cdn.reicon.dev/logos/google/original.svg"
									alt="Google"
									width={16}
									height={16}
								/>
								Continue with Google
							</>
						)}
					</Button>
					<Button
						type="button"
						size={"xl"}
						variant="default"
						className="h-11 w-full"
						disabled={socialLoginProvider !== null}
						onClick={() => handleSocialSignIn("twitter")}
					>
						{socialLoginProvider === "twitter" ? (
							<Loading />
						) : (
							<>
								<img
									src="https://cdn.reicon.dev/logos/x-formerly-twitter/original.svg"
									alt="X Formerly Twitter"
									width={16}
									height={16}
								/>
								Continue with X
							</>
						)}
					</Button>
				</div>
			</Activity>
			<Activity mode={otpEmail ? "visible" : "hidden"}>
				{otpEmail && (
					<EmailOtpVerificationForm
						email={otpEmail}
						returnTo={returnTo}
						onUseDifferentEmail={() => setOtpEmail(null)}
					/>
				)}
			</Activity>
		</div>
	);
}
