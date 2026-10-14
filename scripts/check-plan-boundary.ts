// Fails when subscription-status decisions live outside packages/plan.
import { readFileSync } from "node:fs";
import { Glob } from "bun";

const creemOnly = "scheduled_cancel|trialing|past_due|unpaid|paused|canceled";
const shared = "active|expired";
const compare = (literals: string) =>
	new RegExp(`(===|!==)\\s*"(${literals})"|"(${literals})"\\s*(===|!==)`);
const listCheck = new RegExp(
	`\\[[^\\]]*"(${creemOnly}|${shared})"[^\\]]*\\]\\s*\\.(includes|has)\\(`,
);

const ignored =
	/(^|\/)(node_modules|tests|migrations|\.next|dist)\/|^packages\/plan\//;
const violations: string[] = [];
for (const root of ["apps", "packages"]) {
	for (const file of new Glob(`${root}/**/*.{ts,tsx}`).scanSync(".")) {
		if (ignored.test(file)) continue;
		const source = readFileSync(file, "utf8");
		const touchesSubscriptions = /creemSubscription|@grabbin\/plan/.test(
			source,
		);
		source.split("\n").forEach((line, index) => {
			const hit =
				compare(creemOnly).test(line) ||
				(touchesSubscriptions &&
					/subscription|access|plan|canceled/i.test(line) &&
					(compare(shared).test(line) || listCheck.test(line)));
			if (hit) violations.push(`${file}:${index + 1}: ${line.trim()}`);
		});
	}
}
if (violations.length) {
	console.error(
		"Subscription status decisions belong in packages/plan:\n" +
			violations.join("\n"),
	);
	process.exit(1);
}
console.log("Plan boundary check passed.");
