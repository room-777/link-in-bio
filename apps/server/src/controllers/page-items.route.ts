import { requiredSession } from "../middlewares/session.middleware";
import { persistPageItemBatch } from "../services/page-item.service";
import { createPageItemsController } from "./page-items.controller";

export const pageItemsController = createPageItemsController({
	sessionMiddleware: requiredSession,
	persist: persistPageItemBatch,
});
