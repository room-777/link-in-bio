import { createBoundPageDomainService } from "@grabbin/application/page-domain";
import type { DatabaseClient } from "@grabbin/db";
import type { CronBindings } from "./types";

export function arePageDomainsConfigured(bindings: CronBindings) {
	return Boolean(
		bindings.CLOUDFLARE_SAAS_ZONE_ID && bindings.CLOUDFLARE_SAAS_API_TOKEN,
	);
}

export async function expirePageDomains({
	db,
	bindings,
	date,
	skipUserIds,
}: {
	db: DatabaseClient;
	bindings: CronBindings;
	date: Date;
	skipUserIds: ReadonlySet<string>;
}) {
	if (!arePageDomainsConfigured(bindings)) return;
	await createBoundPageDomainService(db, bindings, () => date).expire({
		skipUserIds: [...skipUserIds],
	});
}

export async function cleanupDeletingPageDomains({
	db,
	bindings,
	date,
}: {
	db: DatabaseClient;
	bindings: CronBindings;
	date: Date;
}) {
	if (!arePageDomainsConfigured(bindings)) return;
	await createBoundPageDomainService(
		db,
		bindings,
		() => date,
	).cleanupDeleting();
}
