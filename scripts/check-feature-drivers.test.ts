import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkDriverSource } from "../.agents/skills/verify-editor/harness/driver-rules";
import {
	buildUiContract,
	type UiContract,
} from "../.agents/skills/verify-editor/harness/ui-contract";

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
	test("a harness-only driver passes", () => {
		expect(
			messages(`
await openOwner("editor-tweet");
await control(page, "button", "Advanced").click();
await control(card, "button", "Add media").click();
await content(page, "option", "Local Test Place").click();
result("editor-tweet", "tweet-open", "PASS", "ok");
`),
		).toEqual([]);
	});

	test("raw selectors, sleeps, forced actions and direct playwright fail", () => {
		const found = messages(`
import { chromium } from "playwright";
await page.getByRole("button", { name: "Advanced" }).click();
await page.locator('[data-bento-item-id="x"]').hover({ force: true });
await page.waitForTimeout(3000);
const context = await browser.newContext();
`);
		expect(found).toHaveLength(6);
		expect(found.join("\n")).toContain("not playwright directly");
		expect(found.join("\n")).toContain(".getByRole() is harness-only");
		expect(found.join("\n")).toContain("force: true");
		expect(found.join("\n")).toContain(".waitForTimeout() is harness-only");
		expect(found.join("\n")).toContain(".newContext() is harness-only");
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

	test("each feature's results need their own journey", () => {
		expect(
			messages(`
await openOwner("editor-tweet");
result("editor-tweet", "a", "PASS", "");
result("editor-map-editing", "b", "PASS", "");
`),
		).toEqual([
			'results for "editor-map-editing" need their own journey: open it with journeys.open("editor-map-editing") or openOwner("editor-map-editing")',
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
