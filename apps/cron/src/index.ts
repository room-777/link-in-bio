import { createDb } from "@grabbin/db";
import { runDailyMaintenance } from "./jobs/daily-maintenance";
import type { CronBindings } from "./jobs/types";

export default {
	async scheduled(controller: ScheduledController, bindings: CronBindings) {
		const db = await createDb();
		try {
			await runDailyMaintenance({
				db,
				bindings,
				date: new Date(controller.scheduledTime),
			});
		} finally {
			await db.$client.end();
		}
	},
};
