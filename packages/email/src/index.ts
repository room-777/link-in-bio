export type VerificationOTPType =
	| "change-email"
	| "sign-in"
	| "email-verification"
	| "forget-password";

export async function sendVerificationOTP({
	apiKey,
	from,
	email,
	otp,
	type,
}: {
	apiKey: string | undefined;
	from: string | undefined;
	email: string;
	otp: string;
	type: VerificationOTPType;
}): Promise<void> {
	if (!apiKey || !from) {
		throw new Error(
			"RESEND_API_KEY와 RESEND_FROM_EMAIL을 설정해야 이메일 OTP를 보낼 수 있습니다.",
		);
	}

	const subject =
		type === "email-verification"
			? "이메일 인증 코드"
			: type === "change-email"
				? "이메일 변경 인증 코드"
				: type === "forget-password"
					? "비밀번호 재설정 코드"
					: "로그인 코드";
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject,
			text: `${subject}: ${otp}\n이 코드는 5분 동안 유효합니다.`,
		}),
	});

	if (!response.ok) {
		throw new Error(`Resend 이메일 발송 실패: ${response.status}`);
	}
}

export async function sendDeleteAccountVerification({
	apiKey,
	from,
	email,
	url,
}: {
	apiKey: string | undefined;
	from: string | undefined;
	email: string;
	url: string;
}): Promise<void> {
	if (!apiKey || !from) {
		throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject: "Confirm account deletion",
			text: `Click this link to permanently delete your Grabbin account:\n${url}\n\nIf you did not request this, you can ignore this email.`,
		}),
	});

	if (!response.ok) {
		throw new Error(`Resend email delivery failed: ${response.status}`);
	}
}
