import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ArchitectureContext } from "./context";

function usesClientSessionHook(source: string) {
	return /\bauthClient\s*\.\s*useSession\s*\(/.test(source);
}

assert.equal(usesClientSessionHook("const s = authClient.useSession();"), true);
assert.equal(usesClientSessionHook("const s = useSession();"), false);

// authClient.useSession() hydrates with the browser's session while the server
// rendered it pending; React keeps the server's attributes, so a control the
// session enables can stay disabled. useSession() from lib/auth-client
// hydrates from the pending state instead.
export function checkSessionRules(context: ArchitectureContext) {
	const hook = join(context.sourceDirectory, "lib/auth-client.ts");
	return context.allFiles
		.filter(
			(path) =>
				path !== hook && usesClientSessionHook(readFileSync(path, "utf8")),
		)
		.map(
			(path) =>
				`${relative(context.sourceDirectory, path)}: use useSession() from @/lib/auth-client; authClient.useSession() hydrates with client state and leaves server-rendered attributes such as disabled in place.`,
		);
}
