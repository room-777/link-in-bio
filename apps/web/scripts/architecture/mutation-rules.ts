import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ArchitectureContext } from "./context";
import { relativeToDomain } from "./context";

function mutationHooks(source: string) {
	return [
		...source.matchAll(/\bexport\s+(?:async\s+)?function\s+(use\w+)\b/g),
	].map(([, name]) => name);
}

export function checkMutationRules(context: ArchitectureContext) {
	const errors: string[] = [];

	for (const path of context.mutationFiles) {
		const source = readFileSync(path, "utf8");
		const relativePath = relativeToDomain(
			context,
			path,
			context.mutationDirectory,
		);
		if (basename(path) === "mutation.ts") {
			errors.push(`${relativePath}: use a behavior-specific filename.`);
		}
		if (mutationHooks(source).length !== 1) {
			errors.push(`${relativePath}: export exactly one mutation hook.`);
		}
		if (
			/\b(?:queryOptions|infiniteQueryOptions|useQuery|useSuspenseQuery|useQueries|useSuspenseQueries|useInfiniteQuery|useSuspenseInfiniteQuery)\b/.test(
				source,
			)
		) {
			errors.push(
				`${relativePath}: query definitions and hooks belong in query modules.`,
			);
		}
		if (/queryKey\s*:\s*\[/.test(source)) {
			errors.push(
				`${relativePath}: import query keys from their query module.`,
			);
		}
	}

	return errors;
}
