import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { emailOTP, genericOAuth, testUtils } from "better-auth/plugins";
import { createSignInDatabaseHooks } from "../src/sign-in-method";

type SignIn = { userId: string; method: string; cookie: string | null };

function createTestAuth() {
	const signIns: SignIn[] = [];
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
			emailOTP({
				sendVerificationOTP: async () => {},
			}),
			genericOAuth({
				config: [
					{
						providerId: "google",
						clientId: "test-client",
						tokenUrl: "http://localhost/token",
						authorizationUrl: "http://localhost/authorize",
						getToken: async () => ({ accessToken: "test-token" }),
						getUserInfo: async () => ({
							id: "google-user",
							email: "oauth@example.com",
							emailVerified: true,
							name: "OAuth User",
						}),
					},
				],
			}),
		],
		databaseHooks: createSignInDatabaseHooks({
			trackSignIn: (input) => {
				signIns.push({
					userId: input.userId,
					method: input.method,
					cookie: input.headers?.get("cookie") ?? null,
				});
				return Promise.resolve({ sent: false, reason: "disabled" as const });
			},
		}),
	});
	const post = (path: string, body: unknown) =>
		auth.handler(
			new Request(`http://localhost:3001/auth${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "http://localhost:3001",
					cookie: "_ga=GA1.1.111.222",
				},
				body: JSON.stringify(body),
			}),
		);
	async function signInWithOtp(email: string) {
		const test = (await auth.$context).test;
		await post("/email-otp/send-verification-otp", { email, type: "sign-in" });
		return post("/sign-in/email-otp", { email, otp: test.getOTP(email) });
	}
	return { auth, signIns, signInWithOtp };
}

describe("GA sign-in hooks", () => {
	/**
	 * Case ID: AUTH-GA-001
	 * Given: Better Auth with email OTP and the GA sign-in hooks.
	 * When: a new email signs in, then signs in again.
	 * Then: each real session creation reports one sign-in with method email,
	 *   the user's id and the request's GA cookie (the tracker then decides
	 *   sign_up vs login in the database).
	 * Evidence: HTTP 200 responses and the recorded trackSignIn calls.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("AUTH-GA-001 reports OTP sign-ins with the method and cookies", async () => {
		const { signIns, signInWithOtp } = createTestAuth();
		const first = await signInWithOtp("new@example.com");
		assert.equal(first.status, 200, await first.text());
		const second = await signInWithOtp("new@example.com");
		assert.equal(second.status, 200);

		assert.equal(signIns.length, 2);
		assert.equal(signIns[0]?.method, "email");
		assert.equal(signIns[0]?.cookie, "_ga=GA1.1.111.222");
		assert.ok(signIns[0]?.userId);
		assert.equal(signIns[1]?.method, "email");
		assert.equal(signIns[1]?.cookie, "_ga=GA1.1.111.222");
		assert.equal(signIns[1]?.userId, signIns[0]?.userId);
	});

	/**
	 * Case ID: AUTH-GA-002
	 * Given: the session hook receives contexts from other endpoints.
	 * When: a session comes from an OAuth callback, or from a non-sign-in path.
	 * Then: the callback reports its provider as the method, with the
	 *   request headers; other paths report nothing.
	 * Evidence: recorded trackSignIn calls.
	 * Result: Pass | Fail | Blocked | Not Run
	 */
	it("AUTH-GA-002 uses the OAuth provider and ignores other sessions", async () => {
		const { auth, signIns } = createTestAuth();
		const start = await auth.handler(
			new Request("http://localhost:3001/auth/sign-in/social", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "http://localhost:3001",
				},
				body: JSON.stringify({
					provider: "google",
					callbackURL: "http://localhost:3001/signed-in",
					disableRedirect: true,
				}),
			}),
		);
		assert.equal(start.status, 200);
		const { url } = (await start.json()) as { url: string };
		const state = new URL(url).searchParams.get("state");
		assert.ok(state);
		const cookies = start.headers
			.getSetCookie()
			.map((cookie) => cookie.split(";", 1)[0])
			.join("; ");
		const callback = await auth.handler(
			new Request(
				`http://localhost:3001/auth/callback/google?code=test-code&state=${state}`,
				{
					headers: { cookie: `${cookies}; _ga=GA1.1.1.2` },
				},
			),
		);
		assert.equal(callback.status, 302);

		const hooks = createSignInDatabaseHooks({
			trackSignIn: (input) => {
				signIns.push({
					userId: input.userId,
					method: input.method,
					cookie: input.headers?.get("cookie") ?? null,
				});
				return Promise.resolve({ sent: false, reason: "disabled" as const });
			},
		});
		await hooks.session.create.after({ userId: "u1" }, {
			path: "/update-user",
			headers: new Headers(),
		} as never);
		assert.equal(signIns.length, 1);
		assert.equal(signIns[0]?.method, "google");
		assert.ok(signIns[0]?.cookie?.endsWith("_ga=GA1.1.1.2"));
		assert.ok(signIns[0]?.userId);
	});
});
