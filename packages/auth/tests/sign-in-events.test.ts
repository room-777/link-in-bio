import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { emailOTP, testUtils } from "better-auth/plugins";
import {
	createEmailOtpSignupHooks,
	emailOtpSignupStatusPlugin,
} from "../src/email-otp-signup-status";

function createTestAuth() {
	const auth = betterAuth({
		baseURL: "http://localhost:3001",
		basePath: "/auth",
		secret: "test-secret-test-secret-test-secret",
		database: memoryAdapter({
			user: [],
			session: [],
			account: [],
			verification: [],
		}),
		plugins: [
			testUtils({ captureOTP: true }),
			emailOTP({ sendVerificationOTP: async () => {} }),
			emailOtpSignupStatusPlugin,
		],
		databaseHooks: createEmailOtpSignupHooks(),
	});
	const post = (path: string, body: unknown) =>
		auth.handler(
			new Request(`http://localhost:3001/auth${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "http://localhost:3001",
				},
				body: JSON.stringify(body),
			}),
		);
	async function sendCode(email: string) {
		const test = (await auth.$context).test;
		await post("/email-otp/send-verification-otp", { email, type: "sign-in" });
		return test.getOTP(email);
	}
	return { post, sendCode };
}

describe("Email OTP signup status", () => {
	it("tells the browser whether OTP created a new account", async () => {
		const { post, sendCode } = createTestAuth();
		const email = "new@example.com";
		const otp = await sendCode(email);

		const signup = await post("/sign-in/email-otp", { email, otp });
		assert.equal(signup.status, 200, await signup.clone().text());
		assert.equal((await signup.json()).isNewUser, true);

		const loginOtp = await sendCode(email);
		const login = await post("/sign-in/email-otp", { email, otp: loginOtp });
		assert.equal(login.status, 200, await login.clone().text());
		assert.equal((await login.json()).isNewUser, false);
	});

	it("does not add signup status when OTP verification fails", async () => {
		const { post, sendCode } = createTestAuth();
		const email = "invalid@example.com";
		await sendCode(email);
		const result = await post("/sign-in/email-otp", { email, otp: "000000" });
		assert.notEqual(result.status, 200);
		assert.equal("isNewUser" in (await result.json()), false);
	});
});
