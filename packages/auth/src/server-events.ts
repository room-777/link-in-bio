import { waitUntil } from "cloudflare:workers";
import { env } from "@grabbin/env/server";
import {
	createServerEventTracker,
	type GoogleAnalyticsConfig,
} from "./google-analytics";

function getConfig(): GoogleAnalyticsConfig | null {
	const measurementId = env.GA_MEASUREMENT_ID;
	const apiSecret = env.GA_MEASUREMENT_PROTOCOL_API_SECRET;
	if (!measurementId || !apiSecret) return null;
	return {
		measurementId,
		apiSecret,
		// Only the production deploy records real hits. Everything else goes to
		// GA's validation endpoint, which checks the hit and stores nothing.
		mode:
			env.GA_MEASUREMENT_PROTOCOL_MODE === "collect" ? "collect" : "validate",
	};
}

/** Background GA4 Measurement Protocol events for the Worker. */
export const serverEvents = createServerEventTracker({
	get config() {
		return getConfig();
	},
	waitUntil,
});
