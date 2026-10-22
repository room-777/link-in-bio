import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	checkDriverSource,
	findFixedSleeps,
	subFeatureIds,
} from "../.agents/skills/verify-editor/harness/driver-rules";
import {
	buildUiContract,
	type UiContract,
} from "../.agents/skills/verify-editor/harness/ui-contract";
import { checkFeatureDrivers } from "./lib/feature-drivers";

const contract: UiContract = {
	names: ["Add link image", "Replace link image", "Advanced", "Zoom in"],
	patterns: ["^Add .+$"],
	dataAttributes: [],
	stateGroups: [["Add link image", "Replace link image"]],
	portals: {},
};
const messages = (source: string) =>
	checkDriverSource(source, contract).map((violation) => violation.message);

describe("feature driver rules", () => {
	test("a journey on the shared fixtures passes", () => {
		expect(
			messages(`
import type { Page } from "@playwright/test";
import { expect, journey } from "../harness/fixtures.ts";
const test = journey("editor-tweet");
test("tweet-open", async ({ ownerPage: page }) => {
	const response = page.waitForResponse((r) => r.url().includes("/preview"));
	await control(page, "button", "Advanced").click();
	await control(card, "button", "Add media").click();
	await content(page, "option", "Local Test Place").click();
	await expect(control(page, "dialog", "Advanced")).toBeVisible();
	await response;
});
`),
		).toEqual([]);
	});

	test("raw selectors, sleeps, forced actions and direct playwright fail", () => {
		const found = messages(`
import { chromium } from "playwright";
import { test } from "@playwright/test";
await page.getByRole("button", { name: "Advanced" }).click();
await page.locator('[data-bento-item-id="x"]').hover({ force: true });
await page.waitForTimeout(3000);
const context = await browser.newContext();
`);
		expect(found).toHaveLength(7);
		const text = found.join("\n");
		expect(text).toContain("import test and expect from harness/fixtures.ts");
		expect(text).toContain(".getByRole() is harness-only");
		expect(text).toContain("force: true");
		expect(text).toContain(".waitForTimeout() is harness-only");
		expect(text).toContain(".newContext() is harness-only");
	});

	test("asserting on a one-shot read fails; web-first assertions retry", () => {
		expect(
			messages(`
expect(await control(page, "button", "Advanced").isVisible()).toBe(true);
expect(await dialog.textContent()).toContain("Tweet");
await expect(control(page, "button", "Advanced")).toBeVisible();
expect(await row("select 1")).toBe("1");
`),
		).toEqual([
			"expect(await ….isVisible()) reads once: use await expect(locator).toBeVisible() so it retries",
			"expect(await ….textContent()) reads once: use await expect(locator).toHaveText() or toContainText() so it retries",
		]);
	});

	test("timer sleeps fail in drivers and the harness; deadline timers pass", () => {
		const sleeps = findFixedSleeps(`
import { setTimeout as sleep } from "node:timers/promises";
await new Promise((resolve) => setTimeout(resolve, 300));
await new Promise((resolve) => setTimeout(() => resolve(), 2000));
await page.waitForTimeout(500);
const deadline = setTimeout(() => reject(new Error("late")), 20000);
`);
		expect(sleeps.map((sleep) => sleep.line)).toEqual([2, 3, 4, 5]);
		expect(
			messages("await new Promise((resolve) => setTimeout(resolve, 300));"),
		).toEqual([expect.stringContaining("fixed sleep")]);
	});

	test("a label built from a template accepts any filled-in value", () => {
		expect(
			messages(`await control(card, "button", "Add link photo");`),
		).toEqual([]);
	});

	test("an accessible name the app never renders fails before any browser run", () => {
		expect(messages(`await control(page, "button", "Zoom inn");`)).toEqual([
			'"Zoom inn" is not an accessible name the app renders',
		]);
	});

	test("controlsExcept() names are checked like control() names", () => {
		expect(
			messages(
				`await controlsExcept(detail, "button", ["Advanced", "Back to widgetz"]).count();`,
			),
		).toEqual(['"Back to widgetz" is not an accessible name the app renders']);
	});

	test("app labels cannot hide in content()", () => {
		expect(messages(`await content(page, "button", "Advanced");`)).toEqual([
			'"Advanced" is an app label; use control() so the contract checks it',
		]);
	});

	test("hovering a card to reveal its control fails; the harness reveals it", () => {
		expect(
			messages(`
await linkCard.hover();
const chooser = page.waitForEvent("filechooser");
await control(linkCard, "button", "Replace link image").click();
`),
		).toEqual([
			"linkCard.hover() before acting on a control in linkCard: drop it, the harness hovers the control's own hover group",
		]);
		expect(
			messages(`
await card.hover();
await expectTooltip(card);
await control(page, "button", "Advanced").click();
`),
		).toEqual([]);
	});

	test("a journey file names its own journey and only its feature map's sub-features", () => {
		const check = (source: string) =>
			checkDriverSource(source, contract, {
				journeyId: "editor-tweet",
				subFeatures: ["tweet-open", "tweet-add"],
			}).map((violation) => violation.message);
		expect(
			check(`
const test = journey("editor-tweet");
test("tweet-open", async () => {});
test(\`tweet-add: \${kind}\`, async () => {});
`),
		).toEqual([]);
		expect(
			check(`
const test = journey("editor-map-editing");
test("tweet-open", async () => {});
test("tweet-delete", async () => {});
`),
		).toEqual([
			'journey("editor-map-editing") does not match the file: call journey("editor-tweet")',
			'"tweet-delete" is not a sub-feature in features/editor-tweet.md',
			'features/editor-tweet.md lists "tweet-add" but no test covers it',
		]);
		expect(check(`test("tweet-open", async () => {});`)).toContain(
			'call journey("editor-tweet") so the file runs as its own journey',
		);
	});

	test("sub-feature ids come from the feature map's Sub-features list", () => {
		expect(
			subFeatureIds(`# Tweet

## Sub-features

- \`tweet-open\`: open it.
- \`tweet-add\`: add it.

## Gotchas

- \`not-an-id\`: elsewhere.
`),
		).toEqual(["tweet-open", "tweet-add"]);
	});
});

describe("feature driver check", () => {
	const skill = ".agents/skills/verify-editor";
	const repo = (files: Record<string, string>) => {
		const root = mkdtempSync(path.join(tmpdir(), "feature-drivers-"));
		for (const dir of ["journeys", "features", "harness", "scripts"])
			mkdirSync(path.join(root, skill, dir), { recursive: true });
		for (const [file, source] of Object.entries(files))
			writeFileSync(path.join(root, skill, file), source);
		return root;
	};

	test("checking zero journeys fails instead of passing vacuously", () => {
		expect(checkFeatureDrivers(repo({}), contract)).toEqual([
			`${skill}/journeys: no *.journey.ts files to check`,
		]);
	});

	test("journey specs, setup files and harness sleeps are all checked", () => {
		const root = repo({
			"journeys/editor-tweet.journey.ts": `const test = journey("editor-tweet");
test("tweet-open", async ({ ownerPage: page }) => {
	await page.goto("/x");
});
`,
			"features/editor-tweet.md": "## Sub-features\n\n- `tweet-open`: open.\n",
			"journeys/account.setup.ts": "await page.reload();\n",
			"harness/journey.ts":
				"await new Promise((resolve) => setTimeout(resolve, 300));\n",
		});
		expect(checkFeatureDrivers(root, contract)).toEqual([
			`${skill}/journeys/account.setup.ts:1 .reload() is harness-only: use reloadReady() so the next action waits for hydration`,
			`${skill}/journeys/editor-tweet.journey.ts:3 .goto() is harness-only: use gotoReady() so the next action waits for hydration`,
			`${skill}/harness/journey.ts:1 fixed sleep: wait on the condition itself (a web-first assertion, expect.poll, or a response) instead of a clock`,
		]);
	});

	test("a journey without a feature map fails", () => {
		const root = repo({
			"journeys/editor-tweet.journey.ts": `const test = journey("editor-tweet");\n`,
		});
		expect(checkFeatureDrivers(root, contract)).toEqual([
			`${skill}/journeys/editor-tweet.journey.ts:1 features/editor-tweet.md is missing: every journey maps to a feature map`,
		]);
	});
});

describe("UI contract", () => {
	test("records state-dependent names and controls that live in a popover", () => {
		const source = mkdtempSync(path.join(tmpdir(), "ui-contract-"));
		mkdirSync(path.join(source, "items"));
		writeFileSync(
			path.join(source, "items", "map.tsx"),
			`export function Map({ open, hasImage, editing, value }) {
	const linkLabel = editing ? "Edit link URL" : value ? "Edit media link" : "Add media link";
	return (
		<>
			<button aria-label={hasImage ? "Replace link image" : "Add link image"} />
			<Popover>
				<PopoverTrigger render={<Button aria-label={open ? "Close map controls" : "Open map controls"} />} />
				<PopoverContent>
					<Button aria-label="Zoom in" />
				</PopoverContent>
			</Popover>
			<Button aria-label={\`Add \${kind}\`} />
		</>
	);
}`,
		);
		const contract = buildUiContract(source);
		expect(contract.stateGroups).toContainEqual([
			"Add link image",
			"Replace link image",
		]);
		expect(contract.stateGroups).toContainEqual([
			"Add media link",
			"Edit link URL",
			"Edit media link",
		]);
		expect(contract.portals["Zoom in"]).toEqual([
			"Close map controls",
			"Open map controls",
		]);
		expect(contract.patterns).toContain("^Add .+$");
	});
	test("only strings in accessible-name positions become names", () => {
		const source = mkdtempSync(path.join(tmpdir(), "ui-contract-"));
		writeFileSync(
			path.join(source, "save.ts"),
			`export function save(changed) {
	setStatus(changed ? "dirty" : "saved");
	const endpoint = "/api/items";
	return endpoint;
}`,
		);
		writeFileSync(
			path.join(source, "labels.tsx"),
			`export const presetLabels = { squareLarge: "Full square" };
export const providers = [{ id: "spotify", label: "Spotify" }];
export function Done({ actionLabel = "Go to profile", busy, detail }) {
	return (
		<>
			<Form submitLabel="Grab it" />
			<button>{busy ? <Loading /> : "Verify code"}</button>
			<div aria-label={detail ? undefined : "Advanced widgets"} />
		</>
	);
}`,
		);
		const contract = buildUiContract(source);
		for (const name of [
			"Full square",
			"Spotify",
			"Go to profile",
			"Grab it",
			"Verify code",
			"Advanced widgets",
		])
			expect(contract.names).toContain(name);
		for (const value of ["dirty", "saved", "/api/items", "spotify"])
			expect(contract.names).not.toContain(value);
		expect(
			checkDriverSource(
				`await control(page, "button", "dirty").click();`,
				contract,
			).map((violation) => violation.message),
		).toEqual(['"dirty" is not an accessible name the app renders']);
	});
});
