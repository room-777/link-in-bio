import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
	sendDeleteAccountVerification,
	sendVerificationOTP,
} from "../src/index";

const originalFetch = globalThis.fetch;
const sentRequests: Array<{ url: string; init?: RequestInit }> = [];

afterEach(() => {
	globalThis.fetch = originalFetch;
	sentRequests.length = 0;
});

describe("Resend email templates", () => {
	/**
	 * Case ID: EMAIL-TEMPLATE-001
	 * Given: an OTP and configured Resend credentials and template ID.
	 * When: an OTP email is sent.
	 * Then: Resend receives the OTP template and its OTP variable.
	 * Evidence: captured Resend request body and recipient.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("sends OTP emails with the configured template", async () => {
		globalThis.fetch = (async (input, init) => {
			sentRequests.push({ url: String(input), init });
			return new Response(null, { status: 200 });
		}) as typeof fetch;

		await sendVerificationOTP({
			apiKey: "re_test",
			from: "Grabbin Support <support@grabbin.me>",
			templateId: "otp-template",
			email: "user@example.com",
			otp: "123456",
		});

		assert.equal(sentRequests.length, 1);
		assert.equal(sentRequests[0]?.url, "https://api.resend.com/emails");
		assert.deepEqual(JSON.parse(String(sentRequests[0]?.init?.body)), {
			from: "Grabbin Support <support@grabbin.me>",
			to: ["user@example.com"],
			template: { id: "otp-template", variables: { OTP: "123456" } },
		});
	});

	/**
	 * Case ID: EMAIL-TEMPLATE-002
	 * Given: an account deletion URL and configured Resend credentials and template ID.
	 * When: an account deletion verification email is sent.
	 * Then: Resend receives the deletion template and its DELETE_URL variable.
	 * Evidence: captured Resend request body and recipient.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("sends account deletion emails with the configured template", async () => {
		globalThis.fetch = (async (input, init) => {
			sentRequests.push({ url: String(input), init });
			return new Response(null, { status: 200 });
		}) as typeof fetch;

		await sendDeleteAccountVerification({
			apiKey: "re_test",
			from: "Grabbin Support <support@grabbin.me>",
			templateId: "deletion-template",
			email: "user@example.com",
			url: "https://api.grabbin.me/auth/delete?token=one-time-token",
		});

		assert.equal(sentRequests.length, 1);
		assert.deepEqual(JSON.parse(String(sentRequests[0]?.init?.body)), {
			from: "Grabbin Support <support@grabbin.me>",
			to: ["user@example.com"],
			template: {
				id: "deletion-template",
				variables: {
					DELETE_URL: "https://api.grabbin.me/auth/delete?token=one-time-token",
				},
			},
		});
	});

	/**
	 * Case ID: EMAIL-TEMPLATE-003
	 * Given: configured Resend credentials but no OTP template ID.
	 * When: an OTP email is sent.
	 * Then: the send fails before making a provider request.
	 * Evidence: required-setting error and captured request count.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("requires the template ID before sending", async () => {
		let requestCount = 0;
		globalThis.fetch = (async () => {
			requestCount += 1;
			return new Response(null, { status: 200 });
		}) as typeof fetch;

		await assert.rejects(
			sendVerificationOTP({
				apiKey: "re_test",
				from: "Grabbin Support <support@grabbin.me>",
				templateId: "",
				email: "user@example.com",
				otp: "123456",
			}),
			/RESEND_OTP_TEMPLATE_ID is required/,
		);
		assert.equal(requestCount, 0);
	});
});
