import { requiredSession } from "../middlewares/session.middleware";
import { previewWidget } from "../services/widget-preview.service";
import { createWidgetsController } from "./widgets.controller";

export const widgetsController = createWidgetsController({
	sessionMiddleware: requiredSession,
	preview: previewWidget,
});
