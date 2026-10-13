import { checkComponentRules } from "./architecture/component-rules";
import type { ArchitectureContext } from "./architecture/context";
import { createArchitectureContext } from "./architecture/context";
import { checkMutationRules } from "./architecture/mutation-rules";
import { checkQueryRules } from "./architecture/query-rules";
import { checkRequestBoundaryRules } from "./architecture/request-boundary-rules";

type ArchitectureCheck = (context: ArchitectureContext) => string[];

const checks = {
	queries: checkQueryRules,
	mutations: checkMutationRules,
	"request-boundaries": checkRequestBoundaryRules,
	components: checkComponentRules,
};
const requestedCheck = process.argv[2] ?? "all";
const selectedChecks: [string, ArchitectureCheck][] | null =
	requestedCheck === "all"
		? (Object.entries(checks) as [string, ArchitectureCheck][])
		: requestedCheck in checks
			? [[requestedCheck, checks[requestedCheck as keyof typeof checks]]]
			: null;

if (!selectedChecks) {
	console.error(
		`Unknown architecture check: ${requestedCheck}. Choose all, ${Object.keys(checks).join(", ")}.`,
	);
	process.exitCode = 2;
} else {
	const context = createArchitectureContext();
	const errors = selectedChecks.flatMap(([name, check]) =>
		check(context).map((error) => `${name}: ${error}`),
	);

	if (errors.length > 0) {
		console.error(errors.join("\n"));
		process.exitCode = 1;
	} else {
		console.log(
			`Web architecture checks passed: ${selectedChecks.map(([name]) => name).join(", ")}.`,
		);
	}
}
