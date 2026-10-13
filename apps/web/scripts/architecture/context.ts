import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function filesUnder(directory: string) {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...filesUnder(path));
		else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
			files.push(path);
		}
	}
	return files;
}

export function createArchitectureContext() {
	const sourceDirectory = fileURLToPath(new URL("../../src/", import.meta.url));
	const queryDirectory = join(sourceDirectory, "query");
	const mutationDirectory = join(sourceDirectory, "mutation");
	const componentDirectory = join(sourceDirectory, "components");
	const featureDirectory = join(sourceDirectory, "features");
	const featureFiles = filesUnder(featureDirectory);
	const featureQueryFiles = featureFiles.filter((path) =>
		relative(featureDirectory, path).split(sep).includes("queries"),
	);
	const featureMutationFiles = featureFiles.filter((path) =>
		relative(featureDirectory, path).split(sep).includes("mutations"),
	);
	const featureComponentFiles = featureFiles.filter((path) =>
		relative(featureDirectory, path).split(sep).includes("components"),
	);
	const queryFiles = [...filesUnder(queryDirectory), ...featureQueryFiles];
	const mutationFiles = [
		...filesUnder(mutationDirectory),
		...featureMutationFiles,
	];
	const componentFiles = [
		...filesUnder(componentDirectory),
		...featureComponentFiles,
	];

	return {
		sourceDirectory,
		queryDirectory,
		mutationDirectory,
		componentDirectory,
		featureDirectory,
		allFiles: filesUnder(sourceDirectory),
		queryFiles,
		mutationFiles,
		componentFiles,
		queryFileSet: new Set(queryFiles),
		mutationFileSet: new Set(mutationFiles),
	};
}

export type ArchitectureContext = ReturnType<typeof createArchitectureContext>;

export function relativeToDomain(
	context: ArchitectureContext,
	path: string,
	legacyDirectory: string,
) {
	return path.startsWith(`${legacyDirectory}${sep}`)
		? relative(legacyDirectory, path)
		: relative(context.featureDirectory, path);
}
