/**
 * Posts or updates the one feature-map comment on a pull request.
 * Every value read from the summary artifact is untrusted: a fork PR can
 * write anything into it. Text is escaped, numbers are checked, and the PR
 * number is only used after the API confirms that PR's head is the commit
 * the run tested.
 */
import { readFileSync } from "node:fs";

/** featuremap-results/summary.json, written by `bun run featuremap`. */
export type Failure = {
	feature: string;
	test: string;
	error: string;
	file: string;
};
export type Summary = {
	status: "passed" | "failed";
	total: number;
	passed: number;
	failed: number;
	skipped: number;
	durationMs: number;
	commit: string;
	failures: Failure[];
};

export const MARKER = "<!-- featuremap-ci -->";
const MAX_FAILURES = 30;

const count = (value: unknown) =>
	Number.isSafeInteger(value) && (value as number) >= 0
		? (value as number)
		: undefined;
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Returns the summary, or undefined when the artifact is not a summary. */
export function parseSummary(json: unknown): Summary | undefined {
	const value = (json ?? {}) as Record<string, unknown>;
	const numbers = ["total", "passed", "failed", "skipped", "durationMs"].map(
		(key) => count(value[key]),
	);
	if (
		(value.status !== "passed" && value.status !== "failed") ||
		numbers.some((number) => number === undefined) ||
		!Array.isArray(value.failures)
	)
		return undefined;
	const [total, passed, failed, skipped, durationMs] = numbers as number[];
	return {
		status: value.status,
		total,
		passed,
		failed,
		skipped,
		durationMs,
		commit: text(value.commit),
		failures: value.failures.map((failure: Record<string, unknown>) => ({
			feature: text(failure?.feature),
			test: text(failure?.test),
			error: text(failure?.error),
			file: text(failure?.file),
		})),
	};
}

/** Untrusted text as inert markdown inside one table cell. */
export function escapeCell(value: string, max = 200) {
	const clipped = value.length > max ? `${value.slice(0, max)}…` : value;
	return clipped
		.replace(/\s+/g, " ")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/([\\`*_[\]|~#!])/g, "\\$1")
		.replace(/@/g, "@\u200b")
		.replace(/:\/\//g, ":\u200b//")
		.trim();
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`;
const minutes = (ms: number) =>
	`${Math.floor(ms / 60_000)}분 ${Math.round((ms % 60_000) / 1000)}초`;

export type CommentInput = {
	summary: Summary | undefined;
	repo: string;
	headSha: string;
	runUrl: string;
	runMs?: number;
	artifact?: { url: string; bytes: number };
};

function location(file: string, { repo, headSha }: CommentInput) {
	const match = /^([\w./-]+):(\d+)$/.exec(file);
	if (!match || match[1]?.includes("..")) return escapeCell(file);
	return `[${escapeCell(file)}](https://github.com/${repo}/blob/${headSha}/${match[1]}#L${match[2]})`;
}

function failureRow(failure: Failure, input: CommentInput) {
	return `| ${escapeCell(failure.feature)} | ${escapeCell(failure.test)} | ${escapeCell(failure.error)} | ${location(failure.file, input)} |`;
}

export function renderComment(input: CommentInput) {
	const { summary, headSha, runUrl, runMs, artifact } = input;
	const short = headSha.slice(0, 7);
	const artifactCell = artifact
		? `[featuremap-results](${artifact.url}) (${(artifact.bytes / 1024 / 1024).toFixed(1)} MB, 14일 보관)`
		: "없음";
	if (!summary)
		return [
			MARKER,
			"### ❌ 피처맵 테스트: 결과 요약을 읽지 못했어요",
			"",
			`커밋 \`${short}\`의 실행에서 summary.json이 없거나 형식이 맞지 않았어요. [실행 기록](${runUrl})의 로그를 확인해 주세요.`,
			"",
			`결과 파일(artifact): ${artifactCell}`,
		].join("\n");
	const passed = summary.status === "passed";
	const lines = [
		MARKER,
		passed ? "### ✅ 피처맵 테스트 통과" : "### ❌ 피처맵 테스트 실패",
		"",
		"| 항목 | 값 |",
		"| --- | --- |",
		`| 결과 | ${summary.status} |`,
		`| 테스트 | 전체 ${summary.total} · 통과 ${summary.passed} · 실패 ${summary.failed} · 건너뜀 ${summary.skipped} |`,
		`| 테스트 실행 시간 | ${seconds(summary.durationMs)} |`,
		...(runMs === undefined
			? []
			: [`| 워크플로 전체 시간 | ${minutes(runMs)} |`]),
		`| 커밋 | \`${short}\` |`,
		`| 실행 기록 | [GitHub Actions](${runUrl}) |`,
		`| 결과 파일(artifact) | ${artifactCell} |`,
	];
	if (summary.failures.length) {
		const shown = summary.failures.slice(0, MAX_FAILURES);
		lines.push(
			"",
			`#### 실패 항목 (${summary.failures.length})`,
			"",
			"| 기능 | 테스트 | 오류 첫 줄 | 위치 |",
			"| --- | --- | --- | --- |",
			...shown.map((failure) => failureRow(failure, input)),
		);
		if (summary.failures.length > shown.length)
			lines.push(
				"",
				`나머지 ${summary.failures.length - shown.length}개는 artifact의 results.md에 있어요.`,
			);
	}
	return lines.join("\n");
}

function gh(args: string[], input?: string) {
	const result = Bun.spawnSync(["gh", "api", ...args], {
		stdin: input === undefined ? "ignore" : Buffer.from(input),
		stdout: "pipe",
		stderr: "pipe",
	});
	if (result.exitCode !== 0)
		throw new Error(`gh api ${args[0]}: ${result.stderr.toString().trim()}`);
	return JSON.parse(result.stdout.toString() || "null");
}

function readJson(file: string | undefined) {
	try {
		return file ? JSON.parse(readFileSync(file, "utf8")) : undefined;
	} catch {
		return undefined;
	}
}

if (import.meta.main) {
	const env = (name: string) => {
		const value = process.env[name];
		if (!value) throw new Error(`${name} is required`);
		return value;
	};
	const repo = env("REPO");
	const runId = env("RUN_ID");
	const headSha = env("HEAD_SHA");
	const headRepo = env("HEAD_REPO");
	if (!/^[0-9a-f]{40}$/.test(headSha)) throw new Error("HEAD_SHA is not a sha");
	const number = Number(
		process.env.PR_NUMBER ?? readJson(process.env.PR_FILE)?.number,
	);
	if (!Number.isSafeInteger(number) || number <= 0) {
		console.log("no pull request number; nothing to comment on");
		process.exit(0);
	}
	const pr = gh([`repos/${repo}/pulls/${number}`]);
	if (pr.head.sha !== headSha || pr.head.repo?.full_name !== headRepo) {
		console.log(
			`PR #${number} head is ${pr.head.repo?.full_name}@${pr.head.sha}, not ${headRepo}@${headSha}; not commenting`,
		);
		process.exit(0);
	}
	const run = gh([`repos/${repo}/actions/runs/${runId}`]);
	const ended =
		run.status === "completed" ? Date.parse(run.updated_at) : Date.now();
	const artifacts = gh([`repos/${repo}/actions/runs/${runId}/artifacts`]);
	const found = artifacts.artifacts.find(
		(artifact: { name: string }) => artifact.name === "featuremap-results",
	);
	const body = renderComment({
		summary: parseSummary(readJson(process.env.SUMMARY_FILE)),
		repo,
		headSha,
		runUrl: run.html_url,
		runMs: ended - Date.parse(run.run_started_at),
		artifact: found && {
			url: `https://github.com/${repo}/actions/runs/${runId}/artifacts/${found.id}`,
			bytes: found.size_in_bytes,
		},
	});
	const comments: Array<{ id: number; body: string; user: { login: string } }> =
		gh([
			"--paginate",
			"--slurp",
			`repos/${repo}/issues/${number}/comments`,
		]).flat();
	const mine = comments.find(
		(comment) =>
			comment.user.login === "github-actions[bot]" &&
			comment.body.startsWith(MARKER),
	);
	const payload = JSON.stringify({ body });
	const saved = mine
		? gh(
				[
					"-X",
					"PATCH",
					`repos/${repo}/issues/comments/${mine.id}`,
					"--input",
					"-",
				],
				payload,
			)
		: gh(
				[
					"-X",
					"POST",
					`repos/${repo}/issues/${number}/comments`,
					"--input",
					"-",
				],
				payload,
			);
	console.log(`${mine ? "updated" : "created"} ${saved.html_url}`);
}
