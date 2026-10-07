import { deleteExpiredPages } from "@grabbin/application/page-lifecycle";
import type { DatabaseClient } from "@grabbin/db";
import type { CronBindings } from "./types";

export function deleteExpiredPagesJob({
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
	return deleteExpiredPages({
		db,
		proProductIds: [
			bindings.CREEM_PRO_MONTHLY_PRODUCT_ID,
			bindings.CREEM_PRO_YEARLY_PRODUCT_ID,
		].filter(Boolean),
		skipUserIds,
		now: date,
	});
}
