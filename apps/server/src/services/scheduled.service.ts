import type { DatabaseClient } from "@grabbin/db";
import type { AppEnv } from "../types";
import { reconcileExpiredSubscriptions } from "./billing-reconciliation.service";
import { createBoundPageDomainService } from "./page-domain.service";
import { deleteExpiredPages } from "./page-lifecycle.service";

export async function runScheduledJobs({
	db,
	bindings,
	date = new Date(),
	cron = "0 6 * * *",
}: {
	db: DatabaseClient;
	bindings: AppEnv["Bindings"];
	date?: Date;
	cron?: string;
}) {
	const domainsConfigured = !!(
		bindings.CLOUDFLARE_SAAS_ZONE_ID && bindings.CLOUDFLARE_SAAS_API_TOKEN
	);
	if (cron === "*/5 * * * *") {
		if (domainsConfigured)
			await createBoundPageDomainService(db, bindings, () => date).reconcile({
				allowExpiryCleanup: false,
			});
		return new Set<string>();
	}
	const proProductIds = [
		bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
		bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
	].filter(Boolean);
	const skippedUsers = await reconcileExpiredSubscriptions({
		db,
		env: bindings,
		now: date,
	});
	await deleteExpiredPages({
		db,
		bucket: bindings.R2_BUCKET,
		proProductIds,
		skipUserIds: skippedUsers,
		now: date,
	});
	if (domainsConfigured)
		await createBoundPageDomainService(db, bindings, () => date).expire({
			skipUserIds: [...skippedUsers],
		});
	return skippedUsers;
}
