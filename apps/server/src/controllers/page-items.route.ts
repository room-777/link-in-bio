import { requiredSession } from "../middlewares/session.middleware";
import {
	enrichPageItemMetadata,
	previewSpotifyLinkMetadata,
} from "../services/link-metadata.service";
import { persistPageItemBatch } from "../services/page-item.service";
import { fetchRssFeed } from "../services/rss/rss.service";
import { createPageItemsController } from "./page-items.controller";

export const pageItemsController = createPageItemsController({
	sessionMiddleware: requiredSession,
	persist: persistPageItemBatch,
	enrichMetadata: enrichPageItemMetadata,
	previewSpotify: previewSpotifyLinkMetadata,
	fetchRss: fetchRssFeed,
});
