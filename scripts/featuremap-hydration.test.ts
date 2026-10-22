import { describe, expect, test } from "bun:test";
import { stateMismatch } from "../.agents/skills/verify-editor/harness/hydration";

const HEADER =
	"A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:\n\n- A server/client branch `if (typeof window !== 'undefined')`.\n- Invalid HTML tag nesting.\n\nhttps://react.dev/link/hydration-mismatch\n";

// From the CI run that left the editor's Advanced button disabled.
const DISABLED_BUTTON = `${HEADER}
                        <AdvancedWidgetsDialog actions={{...}}>
                              <button
                                type="button"
                                aria-label="Advanced"
+                               disabled={false}
-                               disabled=""
                                data-slot="button"
-                               data-disabled=""
                              >`;
const EMPTY_STYLE = `${HEADER}
                                      <textarea
                                        id="page-name"
-                                       style={{}}
                                      >`;

describe("feature-map hydration guard", () => {
	test("a mismatch that leaves server state on screen fails", () => {
		expect(stateMismatch(DISABLED_BUTTON)).toBe(
			`${HEADER.split("\n")[0]} Diff: + disabled={false} - disabled="" - data-disabled=""`,
		);
	});

	test("an empty style attribute written outside React does not", () => {
		expect(stateMismatch(EMPTY_STYLE)).toBeUndefined();
	});

	test("other console errors are not mismatches", () => {
		expect(
			stateMismatch("Failed to load resource: net::ERR_FAILED"),
		).toBeUndefined();
	});
});
