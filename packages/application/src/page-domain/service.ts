import type { PageDomainResponse } from "@grabbin/api";
import type { DatabaseClient } from "@grabbin/db";
import { getPlanAccess, PAGE_GRACE_PERIOD_MS } from "@grabbin/plan";
import { parse } from "tldts";
import { PageDomainError } from "../exceptions/page-domain.exception";
import type { CloudflareSaas, DomainDns } from "./cloudflare-saas";
import { createCloudflareSaas, createDomainDns } from "./cloudflare-saas";
import type { DomainPage, PageDomainRepository, PageDomainRow } from "./model";
import { createPageDomainRepository } from "./model";

export type PageDomainBindings = {
	CLOUDFLARE_SAAS_ZONE_ID?: string;
	CLOUDFLARE_SAAS_API_TOKEN?: string;
	CREEM_PRO_MONTHLY_PRODUCT_ID: string;
	CREEM_PRO_YEARLY_PRODUCT_ID: string;
	PAGE_DOMAIN: string;
	CUSTOM_DOMAIN_TARGET?: string;
};

// Cron uses nextCheckAt for expiry handling and deletion retries; DNS and SSL checks run on button requests.
const DOMAIN_EXPIRY_RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_DOMAIN_EXPIRY_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Accepts public subdomains only, including multi-part suffixes such as co.kr. */
function normalizeHostname(raw: string, serviceDomain: string) {
	const hostname = raw.trim().toLowerCase().replace(/\.$/, "");
	if (
		hostname.length > 253 ||
		!/^[a-z0-9.-]+$/.test(hostname) ||
		hostname
			.split(".")
			.some(
				(label) =>
					label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
			)
	)
		throw new PageDomainError("DOMAIN_INVALID");
	const result = parse(hostname, { allowPrivateDomains: true });
	if (
		result.isIp ||
		!result.isIcann ||
		!result.domain ||
		!result.subdomain ||
		hostname === serviceDomain ||
		hostname.endsWith(`.${serviceDomain}`)
	)
		throw new PageDomainError("DOMAIN_INVALID");
	return hostname;
}

function isUniqueConflict(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	return (
		("code" in error && error.code === "23505") ||
		("cause" in error && isUniqueConflict(error.cause))
	);
}

type DomainOptions = {
	store: PageDomainRepository;
	cloudflare: CloudflareSaas;
	dns: DomainDns;
	proProductIds: readonly string[];
	serviceDomain: string;
	target: string;
	configured: boolean;
	now?: () => Date;
};

/** Owns page/domain binding, DNS proof, provider lifecycle, and the shared Pro grace policy. */
export function createPageDomainService(options: DomainOptions) {
	const { store, cloudflare, dns, proProductIds, target } = options;
	const clock = options.now ?? (() => new Date());
	const serviceDomain = new URL(
		options.serviceDomain.includes("://")
			? options.serviceDomain
			: `https://${options.serviceDomain}`,
	).hostname;

	async function ownedPage(
		repo: PageDomainRepository,
		userId: string,
		handle: string,
	) {
		const page = await repo.pageByHandle(handle);
		if (!page || page.userId !== userId)
			throw new PageDomainError("PAGE_NOT_FOUND");
		return page;
	}

	async function access(
		repo: PageDomainRepository,
		page: DomainPage,
		row: PageDomainRow | undefined,
		now: Date,
	) {
		const plan = getPlanAccess(
			await repo.subscriptions(page.userId),
			proProductIds,
			now,
		);
		let graceEndsAt: Date | null = null;
		if (
			!plan.hasAccess &&
			plan.productId &&
			proProductIds.includes(plan.productId)
		) {
			graceEndsAt = plan.periodEnd
				? new Date(plan.periodEnd.getTime() + PAGE_GRACE_PERIOD_MS)
				: (row?.graceEndsAt ?? new Date(now.getTime() + PAGE_GRACE_PERIOD_MS));
		}
		// Preserve the first observed end when the provider has no period-end timestamp.
		if (row && row.graceEndsAt?.getTime() !== graceEndsAt?.getTime()) {
			await repo.update(row.id, { graceEndsAt });
		}
		return {
			canConfigure: plan.hasAccess,
			graceEndsAt,
			canServe: plan.hasAccess || !!(graceEndsAt && graceEndsAt > now),
		};
	}

	async function response(
		repo: PageDomainRepository,
		page: DomainPage,
		row: PageDomainRow | undefined,
		now: Date,
	): Promise<PageDomainResponse> {
		if (!row) return { domain: null };
		const entitlement = await access(repo, page, row, now);
		return {
			domain: {
				id: row.id,
				hostname: row.hostname,
				status:
					row.status === "deleting"
						? "deleting"
						: entitlement.canServe
							? row.status
							: "expired",
				canConfigure: entitlement.canConfigure,
				graceEndsAt: entitlement.graceEndsAt?.toISOString() ?? null,
				lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
				lastError: row.lastError,
				records: [
					{ type: "CNAME", name: row.hostname, value: target },
					{
						type: "TXT",
						name: `_grabbin.${row.hostname}`,
						value: `grabbin-verification=${row.verificationToken}`,
					},
				],
			},
		};
	}

	async function cleanup(id: string, now: Date) {
		return store.lockDomain(id, async (repo) => {
			const row = await repo.byId(id);
			if (!row) return undefined;
			if (row.status !== "deleting") return row;
			try {
				const providerId =
					row.cloudflareHostnameId ??
					(row.verifiedAt
						? (await cloudflare.find(row.hostname))?.id
						: undefined);
				if (providerId) await cloudflare.remove(providerId);
				await repo.remove(id);
				return undefined;
			} catch {
				return repo.update(id, {
					lastError: "Could not disconnect the domain. We will retry.",
					lastCheckedAt: now,
					nextCheckAt: now,
				});
			}
		});
	}

	async function process(id: string, now: Date) {
		let shouldProvision = false;
		// Commit ownership proof before issuing certificates, so interrupted provisioning is recoverable.
		const checked = await store.lockDomain(id, async (repo) => {
			let row = await repo.byId(id);
			if (!row) throw new PageDomainError("DOMAIN_NOT_FOUND");
			if (row.status === "deleting") return row;
			const page = row.pageId ? await repo.pageById(row.pageId) : undefined;
			const entitlement = page ? await access(repo, page, row, now) : null;
			if (!entitlement?.canServe) {
				return repo.update(id, {
					nextCheckAt: new Date(
						now.getTime() + ACTIVE_DOMAIN_EXPIRY_RECHECK_INTERVAL_MS,
					),
					lastError: "The Pro grace period has ended.",
				});
			}
			row = await repo.update(id, {
				graceEndsAt: entitlement.graceEndsAt,
				lastCheckedAt: now,
				nextCheckAt: new Date(
					now.getTime() + DOMAIN_EXPIRY_RECHECK_INTERVAL_MS,
				),
			});
			// Grace preserves existing connections; it cannot authorize a new ownership claim.
			if (!entitlement.canConfigure && !row.verifiedAt)
				return repo.update(id, {
					lastError: "A Pro plan is required to connect this domain.",
				});
			try {
				const cnames = await dns.records(row.hostname, "CNAME");
				if (!cnames.includes(target))
					return repo.update(id, {
						status: "waiting_dns",
						lastError: "Set the CNAME record to the provided target.",
					});
				if (!row.verifiedAt) {
					const tokens = await dns.records(`_grabbin.${row.hostname}`, "TXT");
					if (!tokens.includes(`grabbin-verification=${row.verificationToken}`))
						return repo.update(id, {
							status: "waiting_dns",
							lastError:
								"Set the TXT record to the provided verification value.",
						});
				}
				shouldProvision = true;
				return repo.update(id, {
					status: row.status === "active" ? "active" : "provisioning",
					verifiedAt: row.verifiedAt ?? now,
					lastError: null,
				});
			} catch {
				return repo.update(id, {
					lastError: "Could not check DNS. Please try again.",
				});
			}
		});
		if (checked.status === "deleting") return cleanup(id, now);
		if (!shouldProvision) return checked;
		return store.lockDomain(id, async (repo) => {
			const row = await repo.byId(id);
			if (!row || !["provisioning", "active"].includes(row.status)) return row;
			// A disconnect or account deletion between transactions must not provision a hostname.
			const page = row.pageId ? await repo.pageById(row.pageId) : undefined;
			const entitlement = page ? await access(repo, page, row, now) : null;
			if (!entitlement?.canServe) {
				return repo.update(id, {
					nextCheckAt: new Date(
						now.getTime() + ACTIVE_DOMAIN_EXPIRY_RECHECK_INTERVAL_MS,
					),
					lastError: "The Pro grace period has ended.",
				});
			}
			try {
				const provider = row.cloudflareHostnameId
					? await cloudflare.get(row.cloudflareHostnameId, row.hostname)
					: await cloudflare.ensure(row.hostname);
				const active =
					provider.status === "active" && provider.ssl.status === "active";
				return repo.update(id, {
					cloudflareHostnameId: provider.id,
					hostnameStatus: provider.status,
					certificateStatus: provider.ssl.status,
					status: active ? "active" : "provisioning",
					lastError:
						provider.status.includes("fail") ||
						provider.ssl.status.includes("fail")
							? "Cloudflare could not activate this domain. Check DNS and certificate authority restrictions."
							: null,
					nextCheckAt: new Date(
						Math.min(
							now.getTime() +
								(active
									? ACTIVE_DOMAIN_EXPIRY_RECHECK_INTERVAL_MS
									: DOMAIN_EXPIRY_RECHECK_INTERVAL_MS),
							entitlement.graceEndsAt?.getTime() ?? Number.POSITIVE_INFINITY,
						),
					),
				});
			} catch {
				return repo.update(id, {
					lastError: "Could not check HTTPS setup. We will retry.",
				});
			}
		});
	}

	return {
		async get(userId: string, handle: string) {
			const page = await ownedPage(store, userId, handle);
			const row = await store.byPage(page.id);
			return row
				? store.lockDomain(row.id, async (repo) =>
						response(repo, page, await repo.byId(row.id), clock()),
					)
				: ({ domain: null } satisfies PageDomainResponse);
		},
		async connect(userId: string, handle: string, rawHostname: string) {
			const hostname = normalizeHostname(rawHostname, serviceDomain);
			const page = await ownedPage(store, userId, handle);
			if (!options.configured)
				throw new PageDomainError("DOMAIN_NOT_CONFIGURED");
			try {
				return await store.lockPage(page.id, async (repo) => {
					const currentPage = await ownedPage(repo, userId, handle);
					if (currentPage.id !== page.id)
						throw new PageDomainError("PAGE_NOT_FOUND");
					if (
						!(await access(repo, currentPage, undefined, clock())).canConfigure
					)
						throw new PageDomainError("PRO_REQUIRED");
					const existing = await repo.byPage(page.id);
					if (existing) {
						if (
							existing.hostname !== hostname ||
							existing.status === "deleting"
						)
							throw new PageDomainError("PAGE_DOMAIN_EXISTS");
						return response(repo, currentPage, existing, clock());
					}
					if (await repo.byHostname(hostname))
						throw new PageDomainError("DOMAIN_TAKEN");
					const row = await repo.insert({
						id: crypto.randomUUID(),
						pageId: page.id,
						hostname,
						verificationToken: crypto.randomUUID(),
						nextCheckAt: clock(),
					});
					return response(repo, currentPage, row, clock());
				});
			} catch (error) {
				if (isUniqueConflict(error)) throw new PageDomainError("DOMAIN_TAKEN");
				throw error;
			}
		},
		async check(userId: string, handle: string) {
			const page = await ownedPage(store, userId, handle);
			const row = await store.byPage(page.id);
			if (!row) throw new PageDomainError("DOMAIN_NOT_FOUND");
			if (!options.configured)
				throw new PageDomainError("DOMAIN_NOT_CONFIGURED");
			await process(row.id, clock());
			return store.lockDomain(row.id, async (repo) =>
				response(repo, page, await repo.byId(row.id), clock()),
			);
		},
		async disconnect(userId: string, handle: string) {
			const page = await ownedPage(store, userId, handle);
			const row = await store.byPage(page.id);
			if (!row) return { domain: null } satisfies PageDomainResponse;
			// Persist denial before the external API call, including when deletion fails.
			await store.lockDomain(row.id, async (repo) => {
				if (await repo.byId(row.id))
					await repo.update(row.id, {
						status: "deleting",
						nextCheckAt: clock(),
					});
			});
			await cleanup(row.id, clock());
			return store.lockDomain(row.id, async (repo) =>
				response(repo, page, await repo.byId(row.id), clock()),
			);
		},
		/** Resolves only active, entitled domains for public-host routing. */
		async resolve(rawHostname: string) {
			const hostname = normalizeHostname(rawHostname, serviceDomain);
			const found = await store.byHostname(hostname);
			if (!found) return null;
			return store.lockDomain(found.id, async (repo) => {
				const row = await repo.byId(found.id);
				if (
					!row?.pageId ||
					row.status !== "active" ||
					row.hostnameStatus !== "active" ||
					row.certificateStatus !== "active" ||
					!row.verifiedAt
				)
					return null;
				const page = await repo.pageById(row.pageId);
				if (!page || !(await access(repo, page, row, clock())).canServe)
					return null;
				return { pageId: page.id, handle: page.handle };
			});
		},
		/** Mark expired claims only after billing refresh; a separate daily pass cleans provider entries. */
		async expire({
			skipUserIds = [],
		}: {
			skipUserIds?: readonly string[];
		} = {}) {
			const now = clock();
			const rows = await store.dueForExpiry(now, 100);
			for (const candidate of rows) {
				await store.lockDomain(candidate.id, async (repo) => {
					const row = await repo.byId(candidate.id);
					if (!row || row.status === "deleting") return;
					const page = row.pageId ? await repo.pageById(row.pageId) : undefined;
					if (page && skipUserIds.includes(page.userId)) return;
					if (!page || !(await access(repo, page, row, now)).canServe) {
						await repo.update(row.id, { status: "deleting", nextCheckAt: now });
					}
				});
			}
		},
		async cleanupDeleting() {
			const now = clock();
			const rows = await store.deleting(now, 100);
			for (const row of rows) await cleanup(row.id, now);
		},
	};
}

export type PageDomainService = ReturnType<typeof createPageDomainService>;

/** Connects the domain service to Cloudflare credentials and DNS settings. */
export function createBoundPageDomainService(
	db: DatabaseClient,
	bindings: PageDomainBindings,
	now?: () => Date,
) {
	const zoneId = bindings.CLOUDFLARE_SAAS_ZONE_ID ?? "";
	const token = bindings.CLOUDFLARE_SAAS_API_TOKEN ?? "";
	return createPageDomainService({
		store: createPageDomainRepository(db),
		cloudflare: createCloudflareSaas({ zoneId, token }),
		dns: createDomainDns(),
		proProductIds: [
			bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
			bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
		].filter(Boolean),
		serviceDomain: bindings.PAGE_DOMAIN,
		target: bindings.CUSTOM_DOMAIN_TARGET ?? "custom.grabbin.me",
		configured: !!(zoneId && token),
		now,
	});
}
