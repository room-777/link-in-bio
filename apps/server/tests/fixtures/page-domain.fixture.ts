import assert from "node:assert/strict";
import type {
	DomainPage,
	PageDomainRepository,
	PageDomainRow,
} from "@grabbin/application/page-domain";
import {
	type CloudflareHostname,
	createCloudflareSaas,
	createDomainDns,
	createPageDomainService,
} from "@grabbin/application/page-domain";
import type { pageDomains } from "@grabbin/db/schema/index";
import type { PlanSubscription } from "@grabbin/plan";

export function present<T>(value: T | null | undefined): T {
	assert.ok(value !== undefined && value !== null);
	return value;
}

/** Isolated DB/provider stand-ins; all fetches stay in memory and use fake credentials. */
export function domainFixture() {
	let time = new Date("2026-10-04T00:00:00Z");
	const pages = new Map<string, DomainPage>([
		["page-a", { id: "page-a", userId: "owner-a", handle: "avery" }],
		["page-b", { id: "page-b", userId: "owner-b", handle: "blair" }],
		["page-c", { id: "page-c", userId: "owner-a", handle: "second" }],
	]);
	const pro: PlanSubscription = {
		productId: "pro-test",
		status: "active",
		periodEnd: new Date("2026-11-04T00:00:00Z"),
		cancelAtPeriodEnd: false,
	};
	const plans = new Map<string, PlanSubscription[]>([
		["owner-a", [{ ...pro }]],
		["owner-b", [{ ...pro }]],
	]);
	const rows = new Map<string, PageDomainRow>();
	const records = new Map<string, string[]>();
	const providerRows = new Map<string, CloudflareHostname>();
	const calls: { method: string; url: string; body: unknown }[] = [];
	let providerFailure = "";
	let dnsFailure = false;
	let providerState = { status: "active", ssl: { status: "active" } };
	let failSaveProviderId = false;
	const locks = new Map<string, Promise<unknown>>();
	async function lock<T>(
		key: string,
		work: (repo: PageDomainRepository) => Promise<T>,
	): Promise<T> {
		const prior = locks.get(key) ?? Promise.resolve();
		const task = prior.catch(() => {}).then(() => work(store));
		locks.set(key, task);
		return task;
	}
	const store: PageDomainRepository = {
		async pageByHandle(handle) {
			return [...pages.values()].find((page) => page.handle === handle);
		},
		async pageById(id) {
			return pages.get(id);
		},
		async subscriptions(userId) {
			return plans.get(userId) ?? [];
		},
		async byPage(id) {
			return [...rows.values()].find((row) => row.pageId === id);
		},
		async byHostname(hostname) {
			return [...rows.values()].find((row) => row.hostname === hostname);
		},
		async byId(id) {
			return rows.get(id);
		},
		async insert(input) {
			if (
				[...rows.values()].some(
					(row) =>
						row.hostname === input.hostname || row.pageId === input.pageId,
				)
			)
				throw { code: "23505" };
			const row: PageDomainRow = {
				id: input.id,
				pageId: input.pageId ?? null,
				hostname: input.hostname,
				verificationToken: input.verificationToken,
				status: input.status ?? "waiting_dns",
				cloudflareHostnameId: null,
				hostnameStatus: null,
				certificateStatus: null,
				verifiedAt: null,
				graceEndsAt: null,
				lastCheckedAt: null,
				nextCheckAt: input.nextCheckAt ?? time,
				lastError: null,
				createdAt: time,
				updatedAt: time,
			};
			rows.set(row.id, row);
			return row;
		},
		async update(id, values: Partial<typeof pageDomains.$inferInsert>) {
			if (failSaveProviderId && values.cloudflareHostnameId) {
				failSaveProviderId = false;
				throw new Error("Simulated database failure.");
			}
			const current = rows.get(id);
			assert.ok(current);
			const row = { ...current, ...values, updatedAt: time } as PageDomainRow;
			rows.set(id, row);
			return row;
		},
		async remove(id) {
			rows.delete(id);
		},
		lockPage: (id, work) => lock(`page:${id}`, work),
		lockDomain: (id, work) => lock(`domain:${id}`, work),
		async dueForExpiry(now, limit) {
			return [...rows.values()]
				.filter(
					(row) =>
						row.status !== "deleting" &&
						(!row.pageId ||
							row.nextCheckAt <= now ||
							(!!row.graceEndsAt && row.graceEndsAt <= now)),
				)
				.sort((a, b) => a.nextCheckAt.getTime() - b.nextCheckAt.getTime())
				.slice(0, limit);
		},
		async deleting(now, limit) {
			return [...rows.values()]
				.filter((row) => row.status === "deleting" && row.nextCheckAt <= now)
				.sort((a, b) => a.nextCheckAt.getTime() - b.nextCheckAt.getTime())
				.slice(0, limit);
		},
	};
	const fetcher = (async (
		input: string | URL | Request,
		init?: RequestInit,
	) => {
		const url = new URL(
			input instanceof Request ? input.url : input.toString(),
		);
		const method = init?.method ?? "GET";
		calls.push({
			method,
			url: url.toString(),
			body: init?.body ? JSON.parse(String(init.body)) : null,
		});
		assert.equal(init?.redirect, "manual");
		assert.ok(init?.signal);
		if (url.hostname === "cloudflare-dns.com") {
			if (dnsFailure) throw new Error("Simulated DNS failure.");
			const name = present(url.searchParams.get("name"));
			const type = present(url.searchParams.get("type"));
			return Response.json({
				Status: 0,
				Answer: (records.get(`${type}:${name}`) ?? []).map((value) => ({
					name: `${name}.`,
					type: type === "CNAME" ? 5 : 16,
					data: type === "CNAME" ? `${value}.` : JSON.stringify(value),
				})),
			});
		}
		assert.equal(url.origin, "https://api.cloudflare.com");
		assert.equal(
			new Headers(init?.headers).get("Authorization"),
			"Bearer fake-test-token",
		);
		if (providerFailure === method)
			return Response.json(
				{
					success: false,
					errors: [{ message: "fake-test-token must never be exposed" }],
				},
				{ status: 503 },
			);
		const id = present(url.pathname.split("/").at(-1));
		if (method === "DELETE") {
			const existed = providerRows.delete(id);
			return Response.json(
				{ success: existed, result: null },
				{ status: existed ? 200 : 404 },
			);
		}
		if (method === "POST") {
			const body = JSON.parse(String(init?.body));
			assert.deepEqual(body.ssl, {
				method: "http",
				type: "dv",
				settings: { min_tls_version: "1.2" },
			});
			const row = {
				id: `cf-test-${providerRows.size + 1}`,
				hostname: body.hostname as string,
				...providerState,
			};
			providerRows.set(row.id, row);
			return Response.json({ success: true, result: row });
		}
		const result = url.searchParams.has("hostname")
			? [...providerRows.values()].filter(
					(row) => row.hostname === url.searchParams.get("hostname"),
				)
			: providerRows.get(id);
		return Response.json({ success: true, result });
	}) as typeof fetch;
	const service = createPageDomainService({
		store,
		cloudflare: createCloudflareSaas({
			zoneId: "fake-zone",
			token: "fake-test-token",
			fetcher,
		}),
		dns: createDomainDns(fetcher),
		proProductIds: ["pro-test"],
		serviceDomain: "grabbin.me",
		target: "custom.grabbin.me",
		configured: true,
		now: () => time,
	});
	return {
		service,
		store,
		rows,
		pages,
		plans,
		records,
		providerRows,
		calls,
		get time() {
			return time;
		},
		set time(value: Date) {
			time = value;
		},
		advance(ms = 31_000) {
			time = new Date(time.getTime() + ms);
		},
		failProvider(method: string) {
			providerFailure = method;
		},
		failDns(value: boolean) {
			dnsFailure = value;
		},
		setProviderState(status: string, sslStatus: string) {
			providerState = { status, ssl: { status: sslStatus } };
		},
		failNextProviderIdSave() {
			failSaveProviderId = true;
		},
		prove(row: PageDomainRow) {
			records.set(`CNAME:${row.hostname}`, ["custom.grabbin.me"]);
			records.set(`TXT:_grabbin.${row.hostname}`, [
				`grabbin-verification=${row.verificationToken}`,
			]);
		},
		async active() {
			const connected = await service.connect(
				"owner-a",
				"avery",
				"hello.example.com",
			);
			const row = present(rows.get(present(connected.domain).id));
			this.prove(row);
			await service.check("owner-a", "avery");
			return present(rows.get(row.id));
		},
	};
}
