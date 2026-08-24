import { Resend } from "resend";
import type { AppBindings } from "types/type";

type EmailLink = {
	email: string;
	url: string;
};

type VerificationOTP = {
	email: string;
	otp: string;
	type:
		| "sign-in"
		| "email-verification"
		| "forget-password"
		| "change-email";
};

export async function sendVerificationOTPEmail(
	env: AppBindings,
	{ email, otp }: VerificationOTP,
) {
	const resend = createResendClient(env, "verification OTPs");
	const { error } = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: email,
		template: {
			id: requireTemplateId(
				env.RESEND_OTP_TEMPLATE_ID,
				"RESEND_OTP_TEMPLATE_ID",
			),
			variables: { OTP: otp },
		},
	});

	throwIfResendFailed(error);
}

export async function sendDeleteAccountVerificationEmail(
	env: AppBindings,
	{ email, url }: EmailLink,
) {
	const resend = createResendClient(
		env,
		"account deletion verification emails",
	);
	const { error } = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: email,
		template: {
			id: requireTemplateId(
				env.RESEND_ACCOUNT_DELETION_TEMPLATE_ID,
				"RESEND_ACCOUNT_DELETION_TEMPLATE_ID",
			),
			variables: { DELETE_URL: url },
		},
	});

	throwIfResendFailed(error);
}

function requireTemplateId(
	templateId: string | undefined,
	envName: string,
) {
	if (!templateId) {
		throw new Error(`${envName} is required to send Resend templates.`);
	}

	return templateId;
}

function createResendClient(
	env: AppBindings,
	flow: string,
) {
	if (!env.RESEND_API_KEY) {
		throw new Error(
			`RESEND_API_KEY is required to send ${flow}.`,
		);
	}

	return new Resend(env.RESEND_API_KEY);
}

function throwIfResendFailed(
	error: { message: string } | null,
) {
	if (error) {
		throw new Error(
			`Resend failed: ${error.message}`,
		);
	}
}
