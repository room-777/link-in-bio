import { fileURLToPath } from "node:url";
import { appSources, buildUiContract } from "./ui-contract.ts";

const contract = buildUiContract(
	appSources(fileURLToPath(new URL("../../../../", import.meta.url))),
);
const knownNames = new Set(contract.names);
const namePatterns = contract.patterns.map((pattern) => new RegExp(pattern));
const isKnownName = (name) =>
	knownNames.has(name) || namePatterns.some((pattern) => pattern.test(name));
const knownDataAttributes = new Set(contract.dataAttributes);
// Every label one control can show in some state, across all ternaries that name it.
const stateGroupOf = new Map();
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

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pageOf(scope) {
	return typeof scope.page === "function" ? scope.page() : scope;
}

function isLocator(scope) {
	return typeof scope.page === "function";
}

function assertKnownName(name) {
	if (!isKnownName(name))
		throw new Error(
			`UI contract: "${name}" is not an accessible name the app renders. Use a name the app renders, or content() for fixture data.`,
		);
}

function matcherFor(names) {
	const group = names.length === 1 ? stateGroupOf.get(names[0]) : undefined;
	const alternatives = group ?? names;
	return alternatives.length === 1
		? { name: alternatives[0], exact: true }
		: {
				name: new RegExp(`^(${alternatives.map(escapeRegExp).join("|")})$`),
			};
}

async function waitHydrated(locator) {
	await locator.evaluate(
		(element, timeout) =>
			new Promise((resolve, reject) => {
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

async function blockerReport(locator) {
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

function wrap(locator, prepare, label) {
	return new Proxy(locator, {
		get(target, property) {
			const value = Reflect.get(target, property);
			if (typeof value !== "function") return value;
			if (CHAINS.has(property))
				return (...args) => wrap(value.apply(target, args), prepare, label);
			if (!ACTIONS.has(property)) return value.bind(target);
			return async (...args) => {
				try {
					await prepare(target);
					return await value.apply(target, args);
				} catch (error) {
					const dialogs = await blockerReport(target);
					error.message = `${label}: ${error.message}${dialogs.length ? `\nOpen dialogs: ${dialogs.join(", ")}` : ""}`;
					throw error;
				}
			};
		},
	});
}

function prepareFor(scope, { opener } = {}) {
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
async function revealHoverGroup(target) {
	const group = await target.evaluate((element) => {
		const names = new Set();
		for (let node = element; node; node = node.parentElement)
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

export function control(scope, role, names, options = {}) {
	const list = names === undefined ? [] : [names].flat();
	for (const name of list) assertKnownName(name);
	const portalOpener =
		list.length === 1 ? contract.portals[list[0]] : undefined;
	const root = portalOpener ? pageOf(scope) : scope;
	const matcher = list.length ? matcherFor(list) : {};
	const locator = root.getByRole(role, { ...matcher, ...options });
	return wrap(
		locator,
		prepareFor(scope, { opener: portalOpener }),
		`${role}${list.length ? ` "${list.join('" | "')}"` : ""}`,
	);
}

/**
 * Every `role` element in `scope` except the named ones, including unnamed
 * ones. Use it to prove something is absent: a name the app must not render
 * cannot pass the contract, so list what is allowed instead.
 */
export function controlsExcept(scope, role, allowed) {
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

export function content(scope, role, name, options = {}) {
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

export function exactText(scope, value) {
	assertKnownName(value);
	return wrap(
		scope.getByText(value, { exact: true }),
		prepareFor(scope),
		`text "${value}"`,
	);
}

function attributeLocator(scope, selector, label) {
	return wrap(scope.locator(selector), prepareFor(scope), label);
}

export function marker(scope, attribute, value = "true") {
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

export function item(scope, id) {
	return wrap(
		scope.locator(`[data-bento-item-id="${id}"]`),
		async (target) => {
			await target.scrollIntoViewIfNeeded();
			await waitHydrated(target);
		},
		`item ${id}`,
	);
}

export function items(scope) {
	return wrap(scope.locator("[data-bento-item-id]"), waitHydrated, "items");
}

export function fileInput(scope, accept) {
	return scope.locator(
		accept ? `input[type="file"][accept="${accept}"]` : 'input[type="file"]',
	);
}

export function otpInput(scope) {
	return attributeLocator(
		scope,
		'input[autocomplete="one-time-code"]',
		"one-time code",
	);
}

export function labelled(scope, name) {
	assertKnownName(name);
	return attributeLocator(
		scope,
		`[aria-label="${name}"]`,
		`[aria-label=${name}]`,
	);
}

export function blobPreview(scope) {
	return scope.locator('img[src^="blob:"]');
}

export function body(scope) {
	return scope.locator("body");
}
