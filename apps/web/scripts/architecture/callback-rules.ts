import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import type { ArchitectureContext } from "./context";

function callbackPropNames(source: string) {
	const names: string[] = [];
	const callbackTypes = new Set(
		Array.from(
			source.matchAll(/\btype\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>/g),
			([, name]) => name,
		),
	);
	const bodies = [
		...Array.from(
			source.matchAll(
				/(?:interface|type)\s+\w*Props\b[^{]*\{([\s\S]*?)^\};?/gm,
			),
			([, body]) => body,
		),
		...Array.from(
			source.matchAll(/\}\s*:\s*\{([\s\S]*?)\}\s*\)\s*(?:=>|\{)/gm),
			([, body]) => body,
		),
	];
	for (const body of bodies) {
		let parenthesisDepth = 0;
		for (const line of body.split("\n")) {
			if (parenthesisDepth === 0) {
				const property = line.match(
					/^\s*([A-Za-z_$][\w$]*)\??\s*:\s*(?:\([^)]*\)\s*=>.*|(?:React\.)?Dispatch\s*<.*|(?:React\.)?[A-Za-z_$][\w$]*Handler\b.*|([A-Za-z_$][\w$]*))\s*;?\s*$/,
				);
				if (property && (!property[2] || callbackTypes.has(property[2]))) {
					names.push(property[1]);
				}
			}
			parenthesisDepth +=
				(line.match(/\(/g)?.length ?? 0) - (line.match(/\)/g)?.length ?? 0);
		}
	}
	return names;
}

assert.deepEqual(
	callbackPropNames(`type Props = {
	save: () => void;
	onSave: () => void;
};
type Save = () => void;
type AliasProps = {
	remove?: Save;
};
function Dialog({ close }: {
	close: () => void;
	onUnmount: () => void;
}) {}`),
	["save", "onSave", "remove", "close", "onUnmount"],
);

export function checkCallbackRules(context: ArchitectureContext) {
	const errors: string[] = [];
	for (const path of context.allFiles) {
		const relativePath = relative(context.sourceDirectory, path);
		const names = callbackPropNames(readFileSync(path, "utf8"));
		for (const name of names) {
			if (name.startsWith("on") && /[A-Z]/.test(name[2] ?? "")) continue;
			// Next.js requires this prop name for its error boundary contract.
			if (name === "reset" && /(^|\/)error\.tsx$/.test(relativePath)) continue;
			errors.push(
				`${relativePath}: function prop "${name}" must start with on.`,
			);
		}
	}
	return errors;
}
