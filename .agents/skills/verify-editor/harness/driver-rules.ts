import { parse } from "@babel/parser";
import type { UiContract } from "./ui-contract.ts";

type Node = { type: string; start: number; [key: string]: unknown };

export const RAW_BROWSER_CALLS: Record<string, string> = {
	$: "use a harness locator from harness/ui.ts",
	$$: "use a harness locator from harness/ui.ts",
	getByAltText: "use control() or content() from harness/ui.ts",
	getByLabel: "use control() or content() from harness/ui.ts",
	getByPlaceholder: "use control() or content() from harness/ui.ts",
	getByRole: "use control() for app labels or content() for fixture data",
	getByTestId: "use control() or content() from harness/ui.ts",
	getByText: "use exactText() from harness/ui.ts",
	getByTitle: "use control() or content() from harness/ui.ts",
	goto: "use gotoReady() so the next action waits for hydration",
	locator: "use a named helper from harness/ui.ts",
	newContext:
		"use the journey's fixtures (ownerPage, signedOutPage, openOwnerPage) so no state leaks",
	newPage:
		"use the journey's fixtures (ownerPage, signedOutPage, openOwnerPage) so no state leaks",
	reload: "use reloadReady() so the next action waits for hydration",
	waitForFunction: "use a web-first assertion or expect.poll",
	waitForSelector: "use a web-first assertion on a harness locator",
	waitForTimeout: "use a web-first assertion or expect.poll",
};
// A one-shot read inside expect() asserts on a snapshot and never retries.
const ONE_SHOT_READS: Record<string, string> = {
	getAttribute: "toHaveAttribute()",
	innerText: "toHaveText() or toContainText()",
	inputValue: "toHaveValue()",
	isChecked: "toBeChecked()",
	isDisabled: "toBeDisabled()",
	isEditable: "toBeEditable()",
	isEnabled: "toBeEnabled()",
	isHidden: "toBeHidden()",
	isVisible: "toBeVisible()",
	textContent: "toHaveText() or toContainText()",
};
const RUNNER_IMPORTS = new Set(["@playwright/test", "playwright"]);
const NAMED_CALLS = new Set([
	"control",
	"controlsExcept",
	"exactText",
	"labelled",
]);
const ROLE_CALLS = new Set(["control", "controlsExcept"]);

export type Violation = { line: number; message: string };
export type JourneyFile = { journeyId: string; subFeatures: string[] };

/** The `- \`id\`:` bullets under a feature map's `## Sub-features` heading. */
export function subFeatureIds(markdown: string): string[] {
	const section = markdown
		.split(/^## /m)
		.find((part) => part.startsWith("Sub-features"));
	return [...(section ?? "").matchAll(/^- `([a-z0-9-]+)`/gm)].map(
		(match) => match[1] as string,
	);
}

function parseSource(source: string) {
	return parse(source, {
		sourceType: "module",
		errorRecovery: false,
		plugins: ["typescript"],
	}) as unknown as Node;
}

function testTitle(node: unknown): string | undefined {
	if (!isNode(node)) return;
	if (node.type === "StringLiteral") return String(node.value);
	if (node.type === "TemplateLiteral") {
		const first = (node.quasis as Node[])[0]?.value as { cooked?: string };
		return first?.cooked;
	}
}

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value;
}

function walk(node: Node, visit: (node: Node) => void) {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "loc" || key.endsWith("Comments")) continue;
		if (Array.isArray(value))
			for (const child of value) if (isNode(child)) walk(child, visit);
		if (isNode(value)) walk(value, visit);
	}
}

export function knownName(contract: UiContract) {
	const names = new Set(contract.names);
	const patterns = contract.patterns.map((pattern) => new RegExp(pattern));
	return (name: string) =>
		names.has(name) || patterns.some((pattern) => pattern.test(name));
}

function literalNames(node: unknown): string[] {
	if (!isNode(node)) return [];
	if (node.type === "StringLiteral") return [String(node.value)];
	if (node.type === "ArrayExpression")
		return (node.elements as unknown[]).flatMap(literalNames);
	return [];
}

const HOVER_WINDOW = 3;

function hoveredScope(statement: Node): string | undefined {
	const call =
		statement.type === "ExpressionStatement" &&
		isNode(statement.expression) &&
		statement.expression.type === "AwaitExpression"
			? (statement.expression.argument as Node)
			: undefined;
	const callee =
		call?.type === "CallExpression" ? (call.callee as Node) : undefined;
	if (
		callee?.type === "MemberExpression" &&
		(callee.property as Node).name === "hover" &&
		(callee.object as Node).type === "Identifier"
	)
		return String((callee.object as Node).name);
}

function usesControlIn(statement: Node, scope: string) {
	let found = false;
	walk(statement, (node) => {
		if (
			node.type === "CallExpression" &&
			(node.callee as Node).type === "Identifier" &&
			NAMED_CALLS.has(String((node.callee as Node).name)) &&
			(node.arguments as Node[])[0]?.type === "Identifier" &&
			(node.arguments as Node[])[0]?.name === scope
		)
			found = true;
	});
	return found;
}

// Hovering a card to reveal a control hovers the wrong element whenever the
// control's hover group is only part of the card; the harness hovers the
// control's own group before every action.
function reportRevealHovers(
	statements: Node[],
	report: (node: Node, message: string) => void,
) {
	statements.forEach((statement, index) => {
		const scope = hoveredScope(statement);
		if (
			scope &&
			statements
				.slice(index + 1, index + 1 + HOVER_WINDOW)
				.some((next) => usesControlIn(next, scope))
		)
			report(
				statement,
				`${scope}.hover() before acting on a control in ${scope}: drop it, the harness hovers the control's own hover group`,
			);
	});
}

const SLEEP_MESSAGE =
	"fixed sleep: wait on the condition itself (a web-first assertion, expect.poll, or a response) instead of a clock";

function resolvesOnly(node: Node) {
	if (node.type === "Identifier") return true;
	if (
		node.type !== "ArrowFunctionExpression" &&
		node.type !== "FunctionExpression"
	)
		return false;
	if ((node.params as Node[]).length) return false;
	let body = node.body as Node;
	if (body.type === "BlockStatement") {
		const statements = body.body as Node[];
		if (
			statements.length !== 1 ||
			statements[0]?.type !== "ExpressionStatement"
		)
			return false;
		body = statements[0].expression as Node;
	}
	return (
		body.type === "CallExpression" &&
		(body.callee as Node).type === "Identifier" &&
		!(body.arguments as Node[]).length
	);
}

/**
 * Fixed sleeps in drivers and in the harness: `waitForTimeout`, a timer whose
 * only job is to resolve a promise later, and `node:timers/promises`. A timer
 * that rejects after a deadline is a timeout, not a sleep, and stays allowed.
 */
export function findFixedSleeps(source: string): Violation[] {
	const ast = parseSource(source);
	const violations: Violation[] = [];
	const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
	walk(ast, (node) => {
		if (
			node.type === "ImportDeclaration" &&
			/^(node:)?timers\/promises$/.test(String((node.source as Node).value))
		)
			violations.push({ line: lineOf(node.start), message: SLEEP_MESSAGE });
		if (node.type !== "CallExpression") return;
		const callee = node.callee as Node;
		const args = node.arguments as Node[];
		const name =
			callee.type === "Identifier"
				? String(callee.name)
				: callee.type === "MemberExpression" && !callee.computed
					? String((callee.property as Node).name)
					: "";
		if (
			name === "waitForTimeout" ||
			(name === "setTimeout" && args[0] && resolvesOnly(args[0]))
		)
			violations.push({ line: lineOf(node.start), message: SLEEP_MESSAGE });
	});
	return violations;
}

/**
 * Rules for a journey spec or setup file. With `journey`, the file must open
 * that journey and its test titles must be exactly the feature map's
 * sub-features (a title may add detail after a colon).
 */
export function checkDriverSource(
	source: string,
	contract: UiContract,
	journey?: JourneyFile,
): Violation[] {
	const ast = parseSource(source);
	const isKnown = knownName(contract);
	const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
	const violations: Violation[] = [];
	const report = (node: Node, message: string) =>
		violations.push({ line: lineOf(node.start), message });
	const journeyCalls: Node[] = [];
	const titles = new Map<string, Node>();

	walk(ast, (node) => {
		if (Array.isArray(node.body))
			reportRevealHovers(node.body as Node[], report);
		if (node.type === "ImportDeclaration" && node.importKind !== "type") {
			const from = String((node.source as Node).value);
			if (RUNNER_IMPORTS.has(from) || from.startsWith("playwright/"))
				report(
					node,
					"import test and expect from harness/fixtures.ts, not the runner directly",
				);
		}
		if (
			node.type === "ObjectProperty" &&
			isNode(node.key) &&
			(node.key.name === "force" || node.key.value === "force") &&
			isNode(node.value) &&
			node.value.type === "BooleanLiteral" &&
			node.value.value === true
		)
			report(
				node,
				"force: true skips actionability checks; fix what blocks the element",
			);
		if (node.type !== "CallExpression") return;
		const callee = node.callee as Node;
		const args = node.arguments as Node[];
		if (callee.type === "MemberExpression" && !callee.computed) {
			const method = String((callee.property as Node).name);
			if (Object.hasOwn(RAW_BROWSER_CALLS, method))
				report(
					node,
					`.${method}() is harness-only: ${RAW_BROWSER_CALLS[method]}`,
				);
			return;
		}
		if (callee.type !== "Identifier") return;
		const name = String(callee.name);
		if (name === "expect" && args[0]?.type === "AwaitExpression") {
			const read = args[0].argument as Node;
			const readCallee =
				read.type === "CallExpression" && (read.callee as Node);
			const method =
				readCallee &&
				readCallee.type === "MemberExpression" &&
				!readCallee.computed &&
				String((readCallee.property as Node).name);
			if (method && Object.hasOwn(ONE_SHOT_READS, method))
				report(
					node,
					`expect(await ….${method}()) reads once: use await expect(locator).${ONE_SHOT_READS[method]} so it retries`,
				);
		}
		if (name === "journey") journeyCalls.push(node);
		if (name === "test") {
			const title = testTitle(args[0]);
			const id = title?.split(":")[0]?.trim();
			if (id !== undefined && !titles.has(id)) titles.set(id, node);
		}
		if (NAMED_CALLS.has(name)) {
			const nameArg = ROLE_CALLS.has(name) ? args[2] : args[1];
			for (const label of literalNames(nameArg))
				if (!isKnown(label))
					report(node, `"${label}" is not an accessible name the app renders`);
		}
		if (name === "content")
			for (const label of literalNames(args[2]))
				if (isKnown(label))
					report(
						node,
						`"${label}" is an app label; use control() so the contract checks it`,
					);
	});

	for (const sleep of findFixedSleeps(source))
		if (!violations.some((v) => v.line === sleep.line)) violations.push(sleep);
	violations.sort((a, b) => a.line - b.line);
	if (journey)
		violations.push(
			...journeyViolations(journey, journeyCalls, titles, lineOf),
		);
	return violations;
}

function journeyViolations(
	{ journeyId, subFeatures }: JourneyFile,
	calls: Node[],
	titles: Map<string, Node>,
	lineOf: (offset: number) => number,
): Violation[] {
	const violations: Violation[] = [];
	const named = calls.map(
		(call) => [call, literalNames((call.arguments as Node[])[0])[0]] as const,
	);
	if (!named.length)
		violations.push({
			line: 1,
			message: `call journey("${journeyId}") so the file runs as its own journey`,
		});
	for (const [call, id] of named)
		if (id !== journeyId)
			violations.push({
				line: lineOf(call.start),
				message: `journey(${id === undefined ? "…" : `"${id}"`}) does not match the file: call journey("${journeyId}")`,
			});
	const listed = new Set(subFeatures);
	for (const [title, call] of titles)
		if (!listed.has(title))
			violations.push({
				line: lineOf(call.start),
				message: `"${title}" is not a sub-feature in features/${journeyId}.md`,
			});
	for (const id of subFeatures)
		if (!titles.has(id))
			violations.push({
				line: 1,
				message: `features/${journeyId}.md lists "${id}" but no test covers it`,
			});
	return violations;
}
