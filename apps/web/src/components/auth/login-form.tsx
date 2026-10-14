"use client";

import { Button } from "@grabbin/ui/components/button";
import Loading from "@grabbin/ui/components/loading";
import { toast } from "@grabbin/ui/components/toast";
import { Activity, useEffect, useState } from "react";
import Logo from "@/components/logo";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";
import { getSignInHref } from "@/lib/auth-redirect";
import {
	getGoogleAnalyticsPageType,
	getLastGoogleAnalyticsPageType,
	trackGoogleAnalyticsEvent,
} from "@/lib/google-analytics";
import EmailOtpForm from "./email-otp-form";
import EmailOtpVerificationForm from "./email-otp-verification-form";

type SocialProvider = "google" | "github" | "twitter";

const SIGN_UP_START_SESSION_KEY = "grabbin:ga-sign-up-start";

/**
 * 가입 화면에 오기 직전 화면 종류. returnTo가 있으면 그 화면, 사이트 안에서 이동해 왔으면
 * 직전 화면, 새로 열었으면 같은 사이트 리퍼러의 화면 종류, 외부 사이트면 external.
 */
function getSignUpEntryPoint(returnTo: string | null | undefined) {
	if (returnTo) {
		return getGoogleAnalyticsPageType(
			new URL(returnTo, window.location.origin).pathname,
			window.location.hostname,
		);
	}
	const previousPageType = getLastGoogleAnalyticsPageType();
	if (previousPageType) return previousPageType;
	try {
		const referrer = new URL(document.referrer);
		if (referrer.origin === window.location.origin) {
			return getGoogleAnalyticsPageType(
				referrer.pathname,
				window.location.hostname,
			);
		}
		return "external";
	} catch {
		return "direct";
	}
}

export default function LoginForm({ returnTo }: { returnTo?: string | null }) {
	const [otpEmail, setOtpEmail] = useState<string | null>(null);
	const [socialLoginProvider, setSocialLoginProvider] =
		useState<SocialProvider | null>(null);
	const signInHref = getSignInHref(returnTo);

	// 가입 화면이 처음 보일 때 세션당 1번만 보낸다.
	useEffect(() => {
		try {
			if (sessionStorage.getItem(SIGN_UP_START_SESSION_KEY)) return;
			sessionStorage.setItem(SIGN_UP_START_SESSION_KEY, "1");
		} catch {
			return;
		}
		trackGoogleAnalyticsEvent("sign_up_start", {
			entry_point: getSignUpEntryPoint(returnTo),
		});
	}, [returnTo]);

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
					<h1 className="mt-4 font-medium text-xl">Good to see you again.</h1>
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
						className="h-12 w-full"
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
						className="h-12 w-full"
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
