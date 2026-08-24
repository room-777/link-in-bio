import { expect, mock, test } from "bun:test";

const sentEmails: Array<Record<string, unknown>> = [];

mock.module("resend", () => ({
	Resend: class {
		emails = {
			send: async (email: Record<string, unknown>) => {
				sentEmails.push(email);
				return { data: { id: "email-id" }, error: null };
			},
		};
	},
}));

const {
	sendDeleteAccountVerificationEmail,
	sendVerificationOTPEmail,
} = await import("./email");

const env = {
	RESEND_API_KEY: "re_test",
	RESEND_FROM_EMAIL: "Grabbin Support <support@grabbin.me>",
	RESEND_OTP_TEMPLATE_ID: "otp-template",
	RESEND_ACCOUNT_DELETION_TEMPLATE_ID: "deletion-template",
} as never;

test("sends the OTP template with the code variable", async () => {
	sentEmails.length = 0;

	await sendVerificationOTPEmail(env, {
		email: "user@example.com",
		otp: "123456",
		type: "sign-in",
	});

	expect(sentEmails[0]).toMatchObject({
		from: "Grabbin Support <support@grabbin.me>",
		to: "user@example.com",
		template: {
			id: "otp-template",
			variables: { OTP: "123456" },
		},
	});
});

test("sends the account deletion template with the generated URL", async () => {
	sentEmails.length = 0;

	await sendDeleteAccountVerificationEmail(env, {
		email: "user@example.com",
		url: "https://api.grabbin.me/auth/delete?token=one-time-token",
	});

	expect(sentEmails[0]).toMatchObject({
		from: "Grabbin Support <support@grabbin.me>",
		to: "user@example.com",
		template: {
			id: "deletion-template",
			variables: {
				DELETE_URL:
					"https://api.grabbin.me/auth/delete?token=one-time-token",
			},
		},
	});
});
