import type { DatabaseClient } from "@grabbin/db";
import { reconcileExpiredBilling } from "./billing-reconciliation";
import { cleanupPendingPageMedia } from "./media-cleanup";
import { cleanupDeletingPageDomains, expirePageDomains } from "./page-domains";
import type { CronBindings } from "./types";

export async function runDailyMaintenance({
	db,
	bindings,
	date,
}: {
	db: DatabaseClient;
	bindings: CronBindings;
	date: Date;
}) {
	const skippedUsers = await reconcileExpiredBilling({ db, bindings, date });
	const mediaCleanup = await cleanupPendingPageMedia({
		db,
		bucket: bindings.R2_BUCKET,
		date,
	});

	if (mediaCleanup.deleted)
		console.info("[media] cleaned up page assets", mediaCleanup);

	await expirePageDomains({
		db,
		bindings,
		date,
		skipUserIds: skippedUsers,
	});

	await cleanupDeletingPageDomains({ db, bindings, date });

	return skippedUsers;
}
