import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	createInitialLinkMetadata,
	normalizeLinkUrl,
} from "@services/link-metadata.service";

describe("link metadata helpers", () => {
	it("adds HTTPS to a host-like link", () => {
		expect(
			normalizeLinkUrl(
				"example.com/about",
			),
		).toBe("https://example.com/about");
	});

	it("preserves mailto links", () => {
		expect(
			normalizeLinkUrl(
				"mailto:hello@example.com",
			),
		).toBe("mailto:hello@example.com");
	});

	it("adds mailto to an email-shaped link", () => {
		expect(
			normalizeLinkUrl(
				"hello@example.com",
			),
		).toBe("mailto:hello@example.com");
	});

	it("creates deterministic initial metadata without fetching", () => {
		expect(
			createInitialLinkMetadata(
				"https://www.example.com/about",
			),
		).toEqual({
			title: "example.com/about",
			faviconUrl:
				"https://icons.duckduckgo.com/ip3/example.com.ico",
		});
		expect(
			createInitialLinkMetadata(
				"mailto:hello@example.com",
			),
		).toEqual({
			title: "hello@example.com",
		});
	});
});
