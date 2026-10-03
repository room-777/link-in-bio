export async function sendVerificationOTP({
	apiKey,
	from,
	templateId,
	email,
	otp,
}: {
	apiKey: string | undefined;
	from: string | undefined;
	templateId: string | undefined;
	email: string;
	otp: string;
}): Promise<void> {
	await sendTemplate({
		apiKey,
		from,
		templateId,
		templateEnvName: "RESEND_OTP_TEMPLATE_ID",
		to: email,
		variables: { OTP: otp },
	});
}

export async function sendDeleteAccountVerification({
	apiKey,
	from,
	templateId,
	email,
	url,
}: {
	apiKey: string | undefined;
	from: string | undefined;
	templateId: string | undefined;
	email: string;
	url: string;
}): Promise<void> {
	await sendTemplate({
		apiKey,
		from,
		templateId,
		templateEnvName: "RESEND_ACCOUNT_DELETION_TEMPLATE_ID",
		to: email,
		variables: { DELETE_URL: url },
	});
}

async function sendTemplate({
	apiKey,
	from,
	templateId,
	templateEnvName,
	to,
	variables,
}: {
	apiKey: string | undefined;
	from: string | undefined;
	templateId: string | undefined;
	templateEnvName: string;
	to: string;
	variables: Record<string, string>;
}): Promise<void> {
	if (!apiKey || !from) {
		throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");
	}
	if (!templateId) {
		throw new Error(
			`${templateEnvName} is required to send a Resend template.`,
		);
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [to],
			template: { id: templateId, variables },
		}),
	});

	if (!response.ok) {
		throw new Error(`Resend email delivery failed: ${response.status}`);
	}
}
