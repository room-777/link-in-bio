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

// Accessible names come from these attributes and from any prop, variable or
// property named like a label (`ariaLabel`, `submitLabel`, `presetLabels`,
// `label:` in a catalog entry). Other string literals are implementation values
// such as save states, so they never become names.
const LABEL_KEY = /^(aria-label|alt)$|(label|labels|title|placeholder)$/i;
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

function keyName(key: unknown): string {
	if (!isNode(key)) return "";
	if (key.type === "Identifier") return String(key.name);
	if (key.type === "StringLiteral") return String(key.value);
	return jsxName(key);
}

/** The labels an expression can evaluate to; a ternary yields one per branch. */
function literalAlternatives(expression: unknown): string[] {
	if (!isNode(expression)) return [];
	if (expression.type === "StringLiteral") {
		const text = String(expression.value).trim();
		return text ? [text] : [];
	}
	if (
		expression.type === "TemplateLiteral" &&
		(expression.expressions as unknown[]).length === 0
	)
		return literalAlternatives({
			type: "StringLiteral",
			value:
				(expression.quasis as Array<{ value?: { cooked?: string } }>)[0]?.value
					?.cooked ?? "",
		});
	if (expression.type === "ConditionalExpression")
		return [
			...literalAlternatives(expression.consequent),
			...literalAlternatives(expression.alternate),
		];
	if (expression.type === "LogicalExpression")
		return literalAlternatives(expression.right);
	if (
		expression.type === "TSAsExpression" ||
		expression.type === "TSSatisfiesExpression"
	)
		return literalAlternatives(expression.expression);
	return [];
}

/** The value written into a label-named slot, or undefined when `node` is no such slot. */
function labelSlot(node: Node): unknown {
	if (node.type === "JSXAttribute" && LABEL_KEY.test(jsxName(node.name))) {
		const value = node.value as Node | null;
		return value?.type === "JSXExpressionContainer" ? value.expression : value;
	}
	if (node.type === "VariableDeclarator" && LABEL_KEY.test(keyName(node.id)))
		return node.init;
	if (node.type === "ObjectProperty" && LABEL_KEY.test(keyName(node.key)))
		return node.value;
	if (node.type === "AssignmentPattern" && LABEL_KEY.test(keyName(node.left)))
		return node.right;
	return undefined;
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
	if (node.type === "JSXAttribute" && LABEL_KEY.test(jsxName(node.name))) {
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

/** Names one control can show; more than one means they are states of that control. */
function accessibleNames(node: Node, parent: Node | undefined): string[] {
	const slot = labelSlot(node);
	if (isNode(slot) && slot.type !== "ObjectExpression")
		return literalAlternatives(slot);
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
			if (
				node.type === "JSXAttribute" &&
				jsxName(node.name).startsWith("data-")
			)
				dataAttributes.add(jsxName(node.name));
			const pattern = namePattern(node, parent);
			if (pattern) patterns.add(pattern);
			const slot = labelSlot(node);
			if (isNode(slot) && slot.type === "ObjectExpression")
				for (const property of slot.properties as Node[])
					for (const name of literalAlternatives(property.value))
						names.add(name);
			const group = accessibleNames(node, parent);
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
