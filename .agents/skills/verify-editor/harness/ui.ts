import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { appSources, buildUiContract } from "./ui-contract.ts";

type Scope = Page | Locator;
type Role = Parameters<Page["getByRole"]>[0];
type RoleOptions = NonNullable<Parameters<Page["getByRole"]>[1]>;
type Prepare = (target: Locator) => Promise<void>;

const contract = buildUiContract(
	appSources(fileURLToPath(new URL("../../../../", import.meta.url))),
);
const knownNames = new Set(contract.names);
const namePatterns = contract.patterns.map((pattern) => new RegExp(pattern));
const isKnownName = (name: string) =>
	knownNames.has(name) || namePatterns.some((pattern) => pattern.test(name));
const knownDataAttributes = new Set(contract.dataAttributes);
// Every label one control can show in some state, across all ternaries that name it.
const stateGroupOf = new Map<string, string[]>();
for (const group of contract.stateGroups)
	for (const name of group)
		stateGroupOf.set(
			name,
			[...new Set([...(stateGroupOf.get(name) ?? []), ...group])].sort(),
		);
const ACTIONS = new Set([
	"check",
	"click",
	"dblclick",
	"dragTo",
	"fill",
	"focus",
	"hover",
	"press",
	"pressSequentially",
	"selectOption",
	"setInputFiles",
	"tap",
	"uncheck",
]);
const CHAINS = new Set(["first", "last", "nth", "filter", "and", "or"]);
const HYDRATION_TIMEOUT = 15_000;

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLocator(scope: Scope): scope is Locator {
	return typeof (scope as Locator).page === "function";
}

function pageOf(scope: Scope): Page {
	return isLocator(scope) ? scope.page() : scope;
}

function assertKnownName(name: string) {
	if (!isKnownName(name))
		throw new Error(
			`UI contract: "${name}" is not an accessible name the app renders. Use a name the app renders, or content() for fixture data.`,
		);
}

function matcherFor(names: string[]): RoleOptions {
	const group =
		names.length === 1 ? stateGroupOf.get(names[0] ?? "") : undefined;
	const alternatives = group ?? names;
	return alternatives.length === 1
		? { name: alternatives[0], exact: true }
		: {
				name: new RegExp(`^(${alternatives.map(escapeRegExp).join("|")})$`),
			};
}

async function waitHydrated(locator: Locator) {
	await locator.evaluate(
		(element, timeout) =>
			new Promise<boolean>((resolve, reject) => {
				const started = performance.now();
				const tick = () => {
					if (
						Object.keys(element).some((key) => key.startsWith("__reactProps"))
					)
						return resolve(true);
					if (performance.now() - started > timeout)
						return reject(new Error("element never hydrated by React"));
					requestAnimationFrame(tick);
				};
				tick();
			}),
		HYDRATION_TIMEOUT,
	);
}

async function blockerReport(locator: Locator): Promise<string[]> {
	const page = pageOf(locator);
	return page
		.evaluate(() =>
			[...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')]
				.filter((node) => node.getClientRects().length > 0)
				.map(
					(node) =>
						node.getAttribute("aria-label") ||
						node.querySelector("h1,h2,h3")?.textContent?.trim() ||
						"(unnamed dialog)",
				),
		)
		.catch(() => []);
}

function wrap(locator: Locator, prepare: Prepare, label: string): Locator {
	return new Proxy(locator, {
		get(target, property) {
			const value = Reflect.get(target, property);
			if (typeof value !== "function" || typeof property !== "string")
				return value;
			if (CHAINS.has(property))
				return (...args: unknown[]) =>
					wrap(value.apply(target, args), prepare, label);
			if (!ACTIONS.has(property)) return value.bind(target);
			return async (...args: unknown[]) => {
				try {
					await prepare(target);
					return await value.apply(target, args);
				} catch (caught) {
					const error = caught as Error;
					const dialogs = await blockerReport(target);
					error.message = `${label}: ${error.message}${dialogs.length ? `\nOpen dialogs: ${dialogs.join(", ")}` : ""}`;
					throw error;
				}
			};
		},
	});
}

function prepareFor(scope: Scope, opener?: string[]): Prepare {
	return async (target) => {
		if (isLocator(scope)) await scope.hover();
		if (opener && !(await target.isVisible())) {
			const trigger = scope.getByRole("button", matcherFor(opener));
			if (isLocator(scope)) await scope.hover();
			await trigger.click();
		}
		await target.waitFor({ state: "attached" });
		await waitHydrated(target);
		await revealHoverGroup(target);
	};
}

// A control styled `group-hover/<name>:pointer-events-auto` only takes clicks
// while the pointer is over its `group/<name>` ancestor, which can be a small
// part of the card. Playwright checks the hit target before it moves the
// mouse, so hovering any other element leaves the click blocked forever.
async function revealHoverGroup(target: Locator) {
	const group = await target.evaluate((element) => {
		const names = new Set<string>();
		for (let node: Element | null = element; node; node = node.parentElement)
			for (const token of node.classList) {
				const match = /^group-hover(?:\/([\w-]+))?:/.exec(token);
				if (match) names.add(match[1] ? `group/${match[1]}` : "group");
			}
		for (let node = element.parentElement; node; node = node.parentElement)
			for (const name of names) if (node.classList.contains(name)) return name;
		return null;
	});
	if (group)
		await target
			.locator(
				`xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ${group} ")][1]`,
			)
			.hover();
}

export function control(
	scope: Scope,
	role: Role,
	names?: string | string[],
	options: RoleOptions = {},
): Locator {
	const list = names === undefined ? [] : [names].flat();
	for (const name of list) assertKnownName(name);
	const portalOpener =
		list.length === 1 ? contract.portals[list[0] ?? ""] : undefined;
	const root = portalOpener ? pageOf(scope) : scope;
	const matcher = list.length ? matcherFor(list) : {};
	const locator = root.getByRole(role, { ...matcher, ...options });
	return wrap(
		locator,
		prepareFor(scope, portalOpener),
		`${role}${list.length ? ` "${list.join('" | "')}"` : ""}`,
	);
}

/**
 * Every `role` element in `scope` except the named ones, including unnamed
 * ones. Use it to prove something is absent: a name the app must not render
 * cannot pass the contract, so list what is allowed instead.
 */
export function controlsExcept(
	scope: Scope,
	role: Role,
	allowed: string | string[],
): Locator {
	const list = [allowed].flat();
	for (const name of list) assertKnownName(name);
	return wrap(
		scope.getByRole(role, {
			name: new RegExp(`^(?!(${list.map(escapeRegExp).join("|")})$)`),
		}),
		prepareFor(scope),
		`${role} except "${list.join('" | "')}"`,
	);
}

export function content(
	scope: Scope,
	role: Role,
	name: string | RegExp,
	options: RoleOptions = {},
): Locator {
	if (typeof name === "string" && isKnownName(name))
		throw new Error(
			`UI contract: "${name}" is an app label; use control() so the contract checks it.`,
		);
	return wrap(
		scope.getByRole(role, { name, ...options }),
		prepareFor(scope),
		`${role} content "${name}"`,
	);
}

export function exactText(scope: Scope, value: string): Locator {
	assertKnownName(value);
	return wrap(
		scope.getByText(value, { exact: true }),
		prepareFor(scope),
		`text "${value}"`,
	);
}

function attributeLocator(scope: Scope, selector: string, label: string) {
	return wrap(scope.locator(selector), prepareFor(scope), label);
}

export function marker(scope: Scope, attribute: string, value = "true") {
	if (!knownDataAttributes.has(attribute))
		throw new Error(
			`UI contract: ${attribute} is not rendered by apps/web/src.`,
		);
	return attributeLocator(
		scope,
		`[${attribute}="${value}"]`,
		`${attribute}=${value}`,
	);
}

export function item(scope: Scope, id: string): Locator {
	return wrap(
		scope.locator(`[data-bento-item-id="${id}"]`),
		async (target) => {
			await target.scrollIntoViewIfNeeded();
			await waitHydrated(target);
		},
		`item ${id}`,
	);
}

export function items(scope: Scope): Locator {
	return wrap(scope.locator("[data-bento-item-id]"), waitHydrated, "items");
}

export function fileInput(scope: Scope, accept?: string): Locator {
	return scope.locator(
		accept ? `input[type="file"][accept="${accept}"]` : 'input[type="file"]',
	);
}

export function otpInput(scope: Scope): Locator {
	return attributeLocator(
		scope,
		'input[autocomplete="one-time-code"]',
		"one-time code",
	);
}

export function labelled(scope: Scope, name: string): Locator {
	assertKnownName(name);
	return attributeLocator(
		scope,
		`[aria-label="${name}"]`,
		`[aria-label=${name}]`,
	);
}

export function blobPreview(scope: Scope): Locator {
	return scope.locator('img[src^="blob:"]');
}

export function body(scope: Scope): Locator {
	return scope.locator("body");
}
