import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	getCookieAttributes,
	shouldEnableCrossSubDomainCookies,
} from "../src/cookie-attributes";

describe("auth cookie attributes", () => {
	it("allows local HTTP to store cookies without HTTPS", () => {
		assert.deepEqual(getCookieAttributes("http://localhost:3001"), {
			sameSite: "lax",
			secure: false,
		});
	});

	it("keeps cross-site secure cookies on HTTPS", () => {
		assert.deepEqual(getCookieAttributes("https://api.grabbin.me"), {
			sameSite: "none",
			secure: true,
		});
	});

	it("shares cookies across Grabbin subdomains only", () => {
		assert.equal(shouldEnableCrossSubDomainCookies("https://grabbin.me"), true);
		assert.equal(
			shouldEnableCrossSubDomainCookies("https://api.grabbin.me"),
			true,
		);
		assert.equal(
			shouldEnableCrossSubDomainCookies("http://localhost:3001"),
			false,
		);
		assert.equal(
			shouldEnableCrossSubDomainCookies("https://preview.workers.dev"),
			false,
		);
	});
});
