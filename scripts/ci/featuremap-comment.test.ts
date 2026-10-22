import { describe, expect, test } from "bun:test";
import {
	escapeCell,
	MARKER,
	parseSummary,
	renderComment,
} from "./featuremap-comment.ts";

const sha = "0123456789abcdef0123456789abcdef01234567";
const base = {
	repo: "room-777/link-in-bio",
	headSha: sha,
	runUrl: "https://github.com/room-777/link-in-bio/actions/runs/1",
	runMs: 372_000,
	artifact: {
		url: "https://github.com/room-777/link-in-bio/actions/runs/1/artifacts/9",
		bytes: 2_516_582,
	},
};
const summary = (overrides = {}) =>
	parseSummary({
		status: "passed",
		total: 72,
		passed: 72,
		failed: 0,
		skipped: 0,
		durationMs: 116_341,
		commit: sha,
		failures: [],
		...overrides,
	});

describe("featuremap comment", () => {
	test("a passing run shows counts, times, commit, run and artifact", () => {
		const body = renderComment({ ...base, summary: summary() });
		expect(body.startsWith(MARKER)).toBe(true);
		expect(body).toContain("✅ 피처맵 테스트 통과");
		expect(body).toContain("전체 72 · 통과 72 · 실패 0 · 건너뜀 0");
		expect(body).toContain("116.3초");
		expect(body).toContain("6분 12초");
		expect(body).toContain("`0123456`");
		expect(body).toContain("(2.4 MB, 14일 보관)");
		expect(body).not.toContain("실패 항목");
	});

	test("a failing run lists each failure with a link to the driver line", () => {
		const body = renderComment({
			...base,
			summary: summary({
				status: "failed",
				passed: 71,
				failed: 1,
				failures: [
					{
						feature: "editor-tweet",
						test: "tweet-add",
						error: "Timeout 12000ms exceeded.",
						file: ".agents/skills/verify-editor/scripts/drive-all.mjs:2338",
					},
				],
			}),
		});
		expect(body).toContain("❌ 피처맵 테스트 실패");
		expect(body).toContain("#### 실패 항목 (1)");
		expect(body).toContain(
			`(https://github.com/room-777/link-in-bio/blob/${sha}/.agents/skills/verify-editor/scripts/drive-all.mjs#L2338)`,
		);
	});

	test("untrusted text cannot break the table, mention, link or inject HTML", () => {
		const cell = escapeCell(
			"a | b\n<img src=x onerror=alert(1)> @wooky [x](https://evil.test) `code` &amp;",
		);
		expect(cell).not.toContain("\n");
		expect(cell).not.toMatch(/(^|[^\\])\|/);
		expect(cell).not.toContain("<img");
		expect(cell).not.toContain("@wooky");
		expect(cell).not.toContain("](https://");
		expect(cell).toContain("&amp;amp;");
		expect(escapeCell("x".repeat(300)).length).toBe(201);
	});

	test("a file outside the repo shape is shown as text, not linked", () => {
		const body = renderComment({
			...base,
			summary: summary({
				status: "failed",
				failures: [{ feature: "f", test: "t", error: "e", file: "../../x:1" }],
			}),
		});
		expect(body).not.toContain("/blob/");
	});

	test("a malformed summary renders the unreadable-summary comment", () => {
		expect(parseSummary({ status: "ok", total: 1 })).toBeUndefined();
		expect(parseSummary({ ...summary(), total: -1 })).toBeUndefined();
		const body = renderComment({ ...base, summary: undefined });
		expect(body).toContain("결과 요약을 읽지 못했어요");
	});

	test("more than 30 failures are capped with a pointer to results.md", () => {
		const failures = Array.from({ length: 35 }, (_, i) => ({
			feature: "f",
			test: `t${i}`,
			error: "e",
			file: "",
		}));
		const body = renderComment({
			...base,
			summary: summary({ status: "failed", failures }),
		});
		expect(body).toContain("나머지 5개는");
		expect(body.match(/\| f \|/g)?.length).toBe(30);
	});
});
