import type { DatabaseClient } from "@grabbin/db";
import type { AppEnv } from "../types";
import { reconcileExpiredSubscriptions } from "./billing-reconciliation.service";
import { deleteExpiredPages } from "./page-lifecycle.service";

export async function runScheduledJobs({
	db,
	bindings,
	date = new Date(),
}: {
	db: DatabaseClient;
	bindings: AppEnv["Bindings"];
	date?: Date;
}) {
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
	return skippedUsers;
}
