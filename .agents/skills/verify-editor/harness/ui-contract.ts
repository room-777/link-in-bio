import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

export type UiContract = {
	names: string[];
	patterns: string[];
	dataAttributes: string[];
	stateGroups: string[][];
	portals: Record<string, string[]>;
};

type Node = { type: string; [key: string]: unknown };

const NAME_ATTRIBUTES = new Set(["aria-label", "title", "placeholder", "alt"]);
const PORTAL_CONTENT = /(Popover|Menu|Select|Combobox)(Content|Popup)$/;
const PORTAL_ROOT = /^(Popover|Menu|Select|Combobox)(Root)?$/;
const PORTAL_TRIGGER = /(Popover|Menu|Select|Combobox)Trigger$/;

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [full]
			: [];
	});
}

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value;
}

function children(node: Node): Node[] {
	return Object.entries(node).flatMap(([key, value]) => {
		if (key === "loc" || key === "extra" || key.endsWith("Comments")) return [];
		if (Array.isArray(value)) return value.filter(isNode);
		return isNode(value) ? [value] : [];
	});
}

function jsxName(name: unknown): string {
	if (!isNode(name)) return "";
	if (name.type === "JSXIdentifier") return String(name.name);
	if (name.type === "JSXMemberExpression")
		return `${jsxName(name.object)}.${jsxName(name.property)}`;
	return "";
}

function tagName(node: Node): string | undefined {
	return node.type === "JSXElement"
		? jsxName((node.openingElement as Node).name)
		: undefined;
}

function literalAlternatives(expression: unknown): string[] {
	if (!isNode(expression)) return [];
	if (expression.type === "StringLiteral") return [String(expression.value)];
	if (
		expression.type === "TemplateLiteral" &&
		(expression.expressions as unknown[]).length === 0
	)
		return [String((expression.quasis as Node[])[0]?.value?.cooked ?? "")];
	if (expression.type === "ConditionalExpression") {
		const whenTrue = literalAlternatives(expression.consequent);
		const whenFalse = literalAlternatives(expression.alternate);
		return whenTrue.length && whenFalse.length
			? [...whenTrue, ...whenFalse]
			: [];
	}
	return [];
}

function templatePattern(expression: unknown): string | undefined {
	if (!isNode(expression) || expression.type !== "TemplateLiteral") return;
	if ((expression.expressions as unknown[]).length === 0) return;
	const quasis = (expression.quasis as Node[]).map((quasi) =>
		String((quasi.value as { cooked?: string }).cooked ?? "").replace(
			/[.*+?^${}()|[\]\\]/g,
			"\\$&",
		),
	);
	if (!quasis.join("").trim()) return;
	return `^${quasis.join(".+")}$`;
}

function namePattern(node: Node, parent: Node | undefined): string | undefined {
	if (node.type === "JSXAttribute" && NAME_ATTRIBUTES.has(jsxName(node.name))) {
		const value = node.value as Node | null;
		return value?.type === "JSXExpressionContainer"
			? templatePattern(value.expression)
			: undefined;
	}
	if (
		node.type === "JSXExpressionContainer" &&
		(parent?.type === "JSXElement" || parent?.type === "JSXFragment")
	)
		return templatePattern(node.expression);
	return undefined;
}

function accessibleNames(node: Node, parent: Node | undefined): string[] {
	if (node.type === "JSXAttribute") {
		const attribute = jsxName(node.name);
		if (!NAME_ATTRIBUTES.has(attribute)) return [];
		const value = node.value as Node | null;
		if (!value) return [];
		if (value.type === "StringLiteral") return [String(value.value)];
		return value.type === "JSXExpressionContainer"
			? literalAlternatives(value.expression)
			: [];
	}
	if (node.type === "JSXText") {
		const text = String(node.value).replace(/\s+/g, " ").trim();
		return text ? [text] : [];
	}
	if (
		node.type === "JSXExpressionContainer" &&
		(parent?.type === "JSXElement" || parent?.type === "JSXFragment")
	)
		return literalAlternatives(node.expression);
	return [];
}

function triggerNames(root: Node): string[] {
	const trigger = (node: Node): Node | undefined => {
		if (PORTAL_TRIGGER.test(tagName(node) ?? "")) return node;
		for (const child of children(node)) {
			const found = trigger(child);
			if (found) return found;
		}
		return undefined;
	};
	const first = (node: Node, parent?: Node): string[] => {
		const names = accessibleNames(node, parent);
		if (names.length) return names;
		for (const child of children(node)) {
			const found = first(child, node);
			if (found.length) return found;
		}
		return [];
	};
	const found = trigger(root);
	return found ? first(found) : [];
}

/** The web app plus the workspace packages whose labels it renders (widget catalog, providers). */
export function appSources(repoRoot: string): string[] {
	const packages = path.join(repoRoot, "packages");
	return [
		path.join(repoRoot, "apps/web/src"),
		...readdirSync(packages)
			.map((name) => path.join(packages, name, "src"))
			.filter((source) => existsSync(source)),
	];
}

export function buildUiContract(sources: string | string[]): UiContract {
	const names = new Set<string>();
	const patterns = new Set<string>();
	const dataAttributes = new Set<string>();
	const stateGroups = new Map<string, string[]>();
	const portals: Record<string, string[]> = {};

	for (const file of [sources].flat().flatMap(sourceFiles)) {
		const ast = parse(readFileSync(file, "utf8"), {
			sourceType: "module",
			plugins: file.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
		}) as unknown as Node;
		const visit = (
			node: Node,
			ancestors: Node[],
			portalRoot: Node | undefined,
		) => {
			const parent = ancestors.at(-1);
			let portal = portalRoot;
			if (PORTAL_CONTENT.test(tagName(node) ?? ""))
				portal =
					[...ancestors]
						.reverse()
						.find((ancestor) => PORTAL_ROOT.test(tagName(ancestor) ?? "")) ??
					node;
			if (node.type === "StringLiteral" && String(node.value).trim())
				names.add(String(node.value).trim());
			if (
				node.type === "JSXAttribute" &&
				jsxName(node.name).startsWith("data-")
			)
				dataAttributes.add(jsxName(node.name));
			const pattern = namePattern(node, parent);
			if (pattern) patterns.add(pattern);
			// `const label = cond ? "Edit media link" : "Add media link"` feeds an
			// aria-label later, so a ternary of labels is a state group too.
			const group =
				node.type === "ConditionalExpression" &&
				parent?.type !== "JSXExpressionContainer"
					? literalAlternatives(node)
					: accessibleNames(node, parent);
			for (const name of group) names.add(name);
			if (group.length > 1) {
				const unique = [...new Set(group)].sort();
				stateGroups.set(unique.join("\u0000"), unique);
			}
			if (portal && group.length) {
				const opener = triggerNames(portal);
				for (const name of group)
					if (opener.length && !opener.includes(name)) portals[name] = opener;
			}
			for (const child of children(node))
				visit(child, [...ancestors, node], portal);
		};
		visit(ast, [], undefined);
	}

	return {
		names: [...names].sort(),
		patterns: [...patterns].sort(),
		dataAttributes: [...dataAttributes].sort(),
		stateGroups: [...stateGroups.values()].sort((a, b) =>
			a.join().localeCompare(b.join()),
		),
		portals: Object.fromEntries(
			Object.entries(portals).sort(([a], [b]) => a.localeCompare(b)),
		),
	};
}
