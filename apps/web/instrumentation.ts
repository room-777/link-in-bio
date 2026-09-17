import * as Sentry from "@sentry/cloudflare";

export function onRequestError(error: Error) {
	Sentry.captureException(error);
}
