import { reconcileExpiredSubscriptions } from "@grabbin/application/billing-reconciliation";
import type { DatabaseClient } from "@grabbin/db";
import type { CronBindings } from "./types";

export function reconcileExpiredBilling({
	db,
	bindings,
	date,
}: {
	db: DatabaseClient;
	bindings: CronBindings;
	date: Date;
}) {
	return reconcileExpiredSubscriptions({ db, env: bindings, now: date });
}
