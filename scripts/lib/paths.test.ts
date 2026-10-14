import { describe, expect, test } from "bun:test";
import { pathToFileURL } from "node:url";
import { dirFromModuleUrl } from "./paths";

describe("dirFromModuleUrl", () => {
	test("decodes spaces and non-ASCII characters", () => {
		const url = pathToFileURL(
			"/tmp/link in bio/한글 폴더/scripts/verify.ts",
		).href;
		expect(url).toContain("%20");
		expect(dirFromModuleUrl(url, "..")).toBe("/tmp/link in bio/한글 폴더/");
	});
});
