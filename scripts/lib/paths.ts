import { fileURLToPath } from "node:url";

/** Filesystem path of the directory `relative` to a module URL, ending in a separator. */
export function dirFromModuleUrl(moduleUrl: string, relative = "."): string {
	const path = fileURLToPath(new URL(relative, moduleUrl));
	return path.endsWith("/") || path.endsWith("\\") ? path : `${path}/`;
}
