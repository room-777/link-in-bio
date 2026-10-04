import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAGE_GRACE_PERIOD_MS } from "@grabbin/plan";
import { PageDomainError } from "../../src/exceptions/page-domain.exception";
import { domainFixture, present } from "../fixtures/page-domain.fixture";

const code = (expected: string) => (error: unknown) =>
	error instanceof PageDomainError && error.code === expected;

describe("custom domain lifecycle", () => {
	/** Case ID: DOMAIN-SVC-001
	 * Given: Pro owner and public subdomains. When: valid and invalid names are submitted.
	 * Then: normalize valid names and reject roots, IPs, Grabbin names and URLs.
	 * Evidence: stored hostname, error codes and zero external calls. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-001 validates and normalizes names", async () => {
		const f = domainFixture();
		for (const name of [
			"example.com",
			"example.co.kr",
			"127.0.0.1",
			"hello.localhost",
			"https://hello.example.com",
			"hello.example.com:443",
			"*.example.com",
			"foo.grabbin.me",
			"a..example.com",
			"-a.example.com",
			"a.internal",
			"a.com/path",
			"foo@bar.com",
			`${"a".repeat(64)}.example.com`,
		]) {
			await assert.rejects(
				f.service.connect("owner-a", "avery", name),
				code("DOMAIN_INVALID"),
			);
		}
		const result = await f.service.connect(
			"owner-a",
			"avery",
			" Hello.Example.CO.KR. ",
		);
		assert.equal(result.domain?.hostname, "hello.example.co.kr");
		assert.equal(f.calls.length, 0);
	});
	/** Case ID: DOMAIN-SVC-002
	 * Given: free users and another owner's page. When: they submit or inspect a domain.
	 * Then: deny access without inserting rows. Evidence: error codes and row count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-002 enforces Pro and page ownership", async () => {
		const f = domainFixture();
		f.plans.set("owner-a", []);
		await assert.rejects(
			f.service.connect("owner-a", "avery", "hello.example.com"),
			code("PRO_REQUIRED"),
		);
		for (const action of [
			() => f.service.get("owner-b", "avery"),
			() => f.service.check("owner-b", "avery"),
			() => f.service.disconnect("owner-b", "avery"),
			() => f.service.connect("owner-b", "avery", "hello.example.com"),
		])
			await assert.rejects(action(), code("PAGE_NOT_FOUND"));
		assert.equal(f.rows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-003
	 * Given: concurrent connections on one page. When: same and different domains are submitted.
	 * Then: one binding and one stable proof token exist. Evidence: row count, IDs, records and conflict codes. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-003 serializes page registration and preserves retries", async () => {
		const f = domainFixture();
		const [a, b] = await Promise.all([
			f.service.connect("owner-a", "avery", "hello.example.com"),
			f.service.connect("owner-a", "avery", "hello.example.com"),
		]);
		assert.deepEqual(a, b);
		assert.equal(f.rows.size, 1);
		await assert.rejects(
			f.service.connect("owner-a", "avery", "other.example.com"),
			code("PAGE_DOMAIN_EXISTS"),
		);
		await assert.rejects(
			f.service.connect("owner-b", "blair", "hello.example.com"),
			code("DOMAIN_TAKEN"),
		);
		await f.service.connect("owner-a", "second", "second.example.com");
		assert.equal(f.rows.size, 2);
	});
	/** Case ID: DOMAIN-SVC-004
	 * Given: a stale CNAME pointing to the common target. When: no current TXT proof exists.
	 * Then: no hostname or certificate is created. Evidence: status and provider request count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-004 requires a fresh claim even with a matching CNAME", async () => {
		const f = domainFixture();
		await f.service.connect("owner-a", "avery", "hello.example.com");
		f.records.set("CNAME:hello.example.com", ["custom.grabbin.me"]);
		f.records.set("TXT:_grabbin.hello.example.com", [
			"grabbin-verification=someone-elses-token",
		]);
		const result = await f.service.check("owner-a", "avery");
		assert.equal(result.domain?.status, "waiting_dns");
		assert.match(present(result.domain?.lastError), /TXT/);
		assert.equal(
			f.calls.filter((call) => call.url.includes("api.cloudflare.com")).length,
			0,
		);
		assert.equal(f.providerRows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-005
	 * Given: valid DNS and a pending certificate. When: DNS is checked and the certificate later activates.
	 * Then: public resolution requires both active statuses. Evidence: provider payload, stored statuses and page ID. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-005 waits for HTTPS and resolves by stable page ID", async () => {
		const f = domainFixture();
		f.setProviderState("active", "pending_validation");
		const connected = await f.service.connect(
			"owner-a",
			"avery",
			"hello.example.com",
		);
		f.prove(present(f.rows.get(present(connected.domain).id)));
		assert.equal(
			(await f.service.check("owner-a", "avery")).domain?.status,
			"provisioning",
		);
		assert.equal(await f.service.resolve("hello.example.com"), null);
		const provider = present([...f.providerRows.values()][0]);
		provider.ssl.status = "active";
		f.advance();
		assert.equal(
			(await f.service.check("owner-a", "avery")).domain?.status,
			"active",
		);
		present(f.pages.get("page-a")).handle = "renamed";
		assert.deepEqual(await f.service.resolve("hello.example.com"), {
			pageId: "page-a",
			handle: "renamed",
		});
		assert.equal(f.calls.filter((call) => call.method === "POST").length, 1);
	});
	/** Case ID: DOMAIN-SVC-006
	 * Given: an active connection. When: provider or resolver temporarily fails.
	 * Then: keep the connection active and hide provider secrets. Evidence: resolve result, status and safe error strings. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-006 preserves an active connection during transient failures", async () => {
		const f = domainFixture();
		await f.active();
		f.advance();
		f.failProvider("GET");
		const failed = await f.service.check("owner-a", "avery");
		assert.equal(failed.domain?.status, "active");
		assert.equal(JSON.stringify(failed).includes("fake-test-token"), false);
		assert.deepEqual(await f.service.resolve("hello.example.com"), {
			pageId: "page-a",
			handle: "avery",
		});
		f.advance();
		f.failDns(true);
		assert.equal(
			(await f.service.check("owner-a", "avery")).domain?.status,
			"active",
		);
	});
	/** Case ID: DOMAIN-SVC-007
	 * Given: a connection was just checked. When: parallel checks arrive within 30 seconds.
	 * Then: deny repeats without further external calls. Evidence: rate-limit code and request count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-007 limits repeated checks", async () => {
		const f = domainFixture();
		await f.active();
		const before = f.calls.length;
		await assert.rejects(
			f.service.check("owner-a", "avery"),
			code("DOMAIN_CHECK_RATE_LIMITED"),
		);
		assert.equal(f.calls.length, before);
	});
	/** Case ID: DOMAIN-SVC-008
	 * Given: an active primary-page domain and an expired Pro period. When: grace starts and exactly seven days pass.
	 * Then: serve during grace, deny new connections, and remove the provider entry at expiry.
	 * Evidence: grace date, access result, Pro error and remaining DB/provider counts. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-008 applies the shared grace period to all pages", async () => {
		const f = domainFixture();
		await f.active();
		const end = new Date(f.time);
		present(present(f.plans.get("owner-a"))[0]).periodEnd = end;
		const result = await f.service.get("owner-a", "avery");
		assert.equal(result.domain?.canConfigure, false);
		assert.equal(
			result.domain?.graceEndsAt,
			new Date(end.getTime() + PAGE_GRACE_PERIOD_MS).toISOString(),
		);
		assert.ok(await f.service.resolve("hello.example.com"));
		await assert.rejects(
			f.service.connect("owner-a", "second", "second.example.com"),
			code("PRO_REQUIRED"),
		);
		f.advance(PAGE_GRACE_PERIOD_MS);
		assert.equal(await f.service.resolve("hello.example.com"), null);
		await f.service.reconcile();
		assert.equal(f.rows.size, 0);
		assert.equal(f.providerRows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-009
	 * Given: expired Pro without a period-end timestamp. When: successive reads and checks occur.
	 * Then: persist one grace deadline without extending it. Evidence: first/stored/final deadline and denied resolution. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-009 never extends grace on repeated reads", async () => {
		const f = domainFixture();
		const row = await f.active();
		Object.assign(present(present(f.plans.get("owner-a"))[0]), {
			status: "expired",
			periodEnd: null,
		});
		const first = present(
			(await f.service.get("owner-a", "avery")).domain,
		).graceEndsAt;
		f.advance(24 * 60 * 60 * 1000);
		assert.equal(
			present((await f.service.get("owner-a", "avery")).domain).graceEndsAt,
			first,
		);
		assert.equal(present(f.rows.get(row.id)).graceEndsAt?.toISOString(), first);
		f.time = new Date(present(first));
		assert.equal(await f.service.resolve("hello.example.com"), null);
	});
	/** Case ID: DOMAIN-SVC-010
	 * Given: a domain still awaiting DNS when Pro ends. When: DNS is added during grace.
	 * Then: no new provider hostname is created. Evidence: provider count and Pro requirement message. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-010 cannot complete an unverified claim during grace", async () => {
		const f = domainFixture();
		const connected = await f.service.connect(
			"owner-a",
			"avery",
			"hello.example.com",
		);
		f.prove(present(f.rows.get(present(connected.domain).id)));
		present(present(f.plans.get("owner-a"))[0]).periodEnd = f.time;
		const result = await f.service.check("owner-a", "avery");
		assert.match(present(result.domain?.lastError), /Pro/);
		assert.equal(f.providerRows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-011
	 * Given: an existing grace deadline. When: Pro is renewed.
	 * Then: clear grace and keep the domain. Evidence: canConfigure, null grace and provider count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-011 preserves connections after renewal", async () => {
		const f = domainFixture();
		const row = await f.active();
		present(present(f.plans.get("owner-a"))[0]).periodEnd = f.time;
		await f.service.get("owner-a", "avery");
		present(present(f.plans.get("owner-a"))[0]).periodEnd = new Date(
			f.time.getTime() + PAGE_GRACE_PERIOD_MS * 2,
		);
		assert.equal(
			(await f.service.get("owner-a", "avery")).domain?.canConfigure,
			true,
		);
		assert.equal(present(f.rows.get(row.id)).graceEndsAt, null);
		assert.equal(f.providerRows.size, 1);
	});
	/** Case ID: DOMAIN-SVC-012
	 * Given: an active domain and failed provider deletion. When: a free owner disconnects and a scheduled retry succeeds.
	 * Then: deny serving immediately, retain the provider ID and reservation until cleanup.
	 * Evidence: deleting row, null resolution, conflict code and final DB/provider counts. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-012 retries deletion without losing the provider ID", async () => {
		const f = domainFixture();
		const row = await f.active();
		const proof = row.verificationToken;
		f.plans.set("owner-a", []);
		f.failProvider("DELETE");
		const result = await f.service.disconnect("owner-a", "avery");
		assert.equal(result.domain?.status, "deleting");
		assert.equal(
			present(f.rows.get(row.id)).cloudflareHostnameId,
			row.cloudflareHostnameId,
		);
		assert.equal(await f.service.resolve(row.hostname), null);
		await assert.rejects(
			f.service.connect("owner-b", "blair", row.hostname),
			code("DOMAIN_TAKEN"),
		);
		f.failProvider("");
		f.advance(5 * 60 * 1000);
		await f.service.reconcile();
		assert.equal(f.rows.size, 0);
		assert.equal(f.providerRows.size, 0);
		const next = await f.service.connect("owner-b", "blair", row.hostname);
		assert.notEqual(
			present(present(next.domain).records[1]).value,
			`grabbin-verification=${proof}`,
		);
	});
	/** Case ID: DOMAIN-SVC-013
	 * Given: a page/account deletion leaves a null page reference. When: cleanup runs.
	 * Then: remove its provider hostname by the retained ID. Evidence: baseline/final provider and DB row counts. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-013 cleans up orphaned registrations", async () => {
		const f = domainFixture();
		const row = await f.active();
		assert.equal(f.rows.size, 1);
		assert.equal(f.providerRows.size, 1);
		f.pages.delete("page-a");
		await f.store.update(row.id, { pageId: null });
		assert.equal(await f.service.resolve(row.hostname), null);
		await f.service.reconcile({ includeActive: false });
		assert.equal(f.rows.size, 0);
		assert.equal(f.providerRows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-014
	 * Given: provider creation succeeded but saving its ID failed. When: the next check retries.
	 * Then: recover the existing hostname instead of creating another. Evidence: verifiedAt, provider ID and POST count. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-014 recovers interrupted provisioning", async () => {
		const f = domainFixture();
		const connected = await f.service.connect(
			"owner-a",
			"avery",
			"hello.example.com",
		);
		const row = present(f.rows.get(present(connected.domain).id));
		f.prove(row);
		f.failNextProviderIdSave();
		await assert.rejects(
			f.service.check("owner-a", "avery"),
			/Simulated database failure/,
		);
		assert.ok(present(f.rows.get(row.id)).verifiedAt);
		assert.equal(present(f.rows.get(row.id)).cloudflareHostnameId, null);
		assert.equal(f.providerRows.size, 1);
		f.advance();
		await f.service.check("owner-a", "avery");
		assert.equal(f.calls.filter((call) => call.method === "POST").length, 1);
		assert.ok(present(f.rows.get(row.id)).cloudflareHostnameId);
	});
	/** Case ID: DOMAIN-SVC-015
	 * Given: the provider returns another hostname for a saved ID. When: connection status is checked.
	 * Then: do not adopt the unrelated provider response. Evidence: unchanged hostname/certificate status and safe error. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-015 validates provider identity", async () => {
		const f = domainFixture();
		const row = await f.active();
		present(f.providerRows.get(present(row.cloudflareHostnameId))).hostname =
			"other.example.com";
		f.advance();
		const result = await f.service.check("owner-a", "avery");
		assert.equal(result.domain?.hostname, row.hostname);
		assert.match(present(result.domain?.lastError), /HTTPS/);
	});
	/** Case ID: DOMAIN-SVC-016
	 * Given: proof exists but CNAME changes, or a provider certificate is deactivated. When: check runs.
	 * Then: public resolution stops. Evidence: waiting_dns/provisioning status and null resolution. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-016 stops routing on confirmed DNS or certificate changes", async () => {
		const f = domainFixture();
		const row = await f.active();
		f.records.set(`CNAME:${row.hostname}`, ["wrong.example.com"]);
		f.advance();
		assert.equal(
			(await f.service.check("owner-a", "avery")).domain?.status,
			"waiting_dns",
		);
		assert.equal(await f.service.resolve(row.hostname), null);
		f.prove(row);
		present(f.providerRows.get(present(row.cloudflareHostnameId))).ssl.status =
			"pending_validation";
		f.advance();
		assert.equal(
			(await f.service.check("owner-a", "avery")).domain?.status,
			"provisioning",
		);
		assert.equal(await f.service.resolve(row.hostname), null);
	});
	/** Case ID: DOMAIN-SVC-017
	 * Given: expired users whose billing refresh failed. When: reconciliation excludes them.
	 * Then: keep their records for a later retry. Evidence: retained row/provider counts and zero delete calls. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-017 respects excluded billing users", async () => {
		const f = domainFixture();
		const row = await f.active();
		present(present(f.plans.get("owner-a"))[0]).periodEnd = new Date(
			f.time.getTime() - PAGE_GRACE_PERIOD_MS,
		);
		await f.store.update(row.id, { nextCheckAt: f.time });
		await f.service.reconcile({ skipUserIds: ["owner-a"] });
		assert.equal(f.rows.size, 1);
		assert.equal(f.providerRows.size, 1);
		assert.equal(
			f.calls.some((call) => call.method === "DELETE"),
			false,
		);
	});
	/** Case ID: DOMAIN-SVC-018
	 * Given: an expired domain whose billing refresh has not completed. When: frequent checks and daily expiration run.
	 * Then: deny serving immediately but delay provider deletion until billing confirmation.
	 * Evidence: retained rows during skipped refresh, deleting status and final DB/provider counts. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-018 waits for billing confirmation before expiry cleanup", async () => {
		const f = domainFixture();
		const row = await f.active();
		present(present(f.plans.get("owner-a"))[0]).periodEnd = new Date(
			f.time.getTime() - PAGE_GRACE_PERIOD_MS,
		);
		await f.store.update(row.id, { nextCheckAt: f.time });
		await f.service.reconcile({ allowExpiryCleanup: false });
		assert.equal(await f.service.resolve(row.hostname), null);
		assert.equal(f.rows.size, 1);
		assert.equal(f.providerRows.size, 1);
		await f.service.expire({ skipUserIds: ["owner-a"] });
		assert.equal(present(f.rows.get(row.id)).status, "active");
		await f.service.expire();
		assert.equal(present(f.rows.get(row.id)).status, "deleting");
		await f.service.reconcile({ allowExpiryCleanup: false });
		assert.equal(f.rows.size, 0);
		assert.equal(f.providerRows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-019
	 * Given: a provider hostname was already deleted. When: the owner retries disconnect.
	 * Then: accept provider 404 and clear the reservation. Evidence: baseline/final row counts and null result. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-019 completes deletion when the provider entry is already gone", async () => {
		const f = domainFixture();
		const row = await f.active();
		f.providerRows.delete(present(row.cloudflareHostnameId));
		assert.equal(f.rows.size, 1);
		assert.equal(f.providerRows.size, 0);
		assert.deepEqual(await f.service.disconnect("owner-a", "avery"), {
			domain: null,
		});
		assert.equal(f.rows.size, 0);
	});
	/** Case ID: DOMAIN-SVC-020
	 * Given: DNS proof was committed and the owner disconnects before provisioning starts.
	 * When: the suspended connection check continues.
	 * Then: never create an orphan provider hostname or resurrect the binding.
	 * Evidence: null result, empty DB/provider maps and zero provider POST calls. Result: Pass | Fail | Blocked | Not Run
	 */
	it("DOMAIN-SVC-020 cannot resurrect a disconnected claim between transactions", async () => {
		const f = domainFixture();
		const connected = await f.service.connect(
			"owner-a",
			"avery",
			"hello.example.com",
		);
		f.prove(present(f.rows.get(present(connected.domain).id)));
		const lock = f.store.lockDomain;
		let completed = 0;
		f.store.lockDomain = async (id, work) => {
			const result = await lock(id, work);
			completed += 1;
			if (completed === 1) await f.service.disconnect("owner-a", "avery");
			return result;
		};
		assert.deepEqual(await f.service.check("owner-a", "avery"), {
			domain: null,
		});
		assert.equal(f.rows.size, 0);
		assert.equal(f.providerRows.size, 0);
		assert.equal(
			f.calls.some((call) => call.method === "POST"),
			false,
		);
	});
});
