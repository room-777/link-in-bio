import { parse } from "@babel/parser";
import type { UiContract } from "./ui-contract.ts";

type Node = { type: string; start: number; [key: string]: unknown };

export const RAW_BROWSER_CALLS: Record<string, string> = {
	$: "use a harness locator from harness/ui.mjs",
	$$: "use a harness locator from harness/ui.mjs",
	getByAltText: "use control() or content() from harness/ui.mjs",
	getByLabel: "use control() or content() from harness/ui.mjs",
	getByPlaceholder: "use control() or content() from harness/ui.mjs",
	getByRole: "use control() for app labels or content() for fixture data",
	getByTestId: "use control() or content() from harness/ui.mjs",
	getByText: "use exactText() from harness/ui.mjs",
	getByTitle: "use control() or content() from harness/ui.mjs",
	goto: "use journeys.open(feature, { route }) or gotoReady()",
	locator: "use a named helper from harness/ui.mjs",
	newContext: "open each feature with journeys.open() so no state leaks",
	newPage: "open each feature with journeys.open() so no state leaks",
	reload: "use reloadReady() so the next action waits for hydration",
	waitForFunction: "wait on a harness locator or settled()",
	waitForSelector: "wait on a harness locator",
	waitForTimeout: "use settled() or wait on a harness locator",
};
const NAMED_CALLS = new Set([
	"control",
	"controlsExcept",
	"exactText",
	"labelled",
]);
const ROLE_CALLS = new Set(["control", "controlsExcept"]);
const CROSS_JOURNEY_FEATURES = new Set(["analytics-events"]);

export type Violation = { line: number; message: string };

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
	"fixed sleep: wait on the condition itself (a harness locator, settled(), or a DB row) instead of a clock";

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
	const ast = parse(source, {
		sourceType: "module",
		errorRecovery: false,
	}) as unknown as Node;
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

export function checkDriverSource(
	source: string,
	contract: UiContract,
): Violation[] {
	const ast = parse(source, {
		sourceType: "module",
		errorRecovery: false,
	}) as unknown as Node;
	const isKnown = knownName(contract);
	const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
	const violations: Violation[] = [];
	const report = (node: Node, message: string) =>
		violations.push({ line: lineOf(node.start), message });
	const resultFeatures = new Map<string, Node>();
	const journeyFeatures = new Set<string>();

	walk(ast, (node) => {
		if (Array.isArray(node.body))
			reportRevealHovers(node.body as Node[], report);
		if (node.type === "ImportDeclaration") {
			const from = String((node.source as Node).value);
			if (from === "playwright" || from.startsWith("playwright/"))
				report(
					node,
					"import browsers through harness/journey.mjs, not playwright directly",
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
			if (method === "open" && literalNames(args[0])[0])
				journeyFeatures.add(literalNames(args[0])[0] as string);
			return;
		}
		if (callee.type !== "Identifier") return;
		const name = String(callee.name);
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
		if (name === "openOwner" && literalNames(args[0])[0])
			journeyFeatures.add(literalNames(args[0])[0] as string);
		if (name === "result" && literalNames(args[0])[0]) {
			const feature = literalNames(args[0])[0] as string;
			if (!resultFeatures.has(feature)) resultFeatures.set(feature, node);
		}
	});

	for (const [feature, node] of resultFeatures)
		if (!journeyFeatures.has(feature) && !CROSS_JOURNEY_FEATURES.has(feature))
			report(
				node,
				`results for "${feature}" need their own journey: open it with journeys.open("${feature}") or openOwner("${feature}")`,
			);
	for (const sleep of findFixedSleeps(source))
		if (!violations.some((v) => v.line === sleep.line)) violations.push(sleep);
	return violations.sort((a, b) => a.line - b.line);
}
