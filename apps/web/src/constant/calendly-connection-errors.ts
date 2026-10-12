import type { CalendlyConnectionErrorCode } from "@grabbin/api";

export const calendlyConnectionErrorMessages: Record<
	CalendlyConnectionErrorCode,
	string
> = {
	authorization_denied:
		"Calendly authorization was cancelled. Approve access and try again.",
	missing_code:
		"Calendly did not return an authorization code. Try connecting again.",
	missing_cookie:
		"Your browser did not return the temporary connection cookie. Restart the connection from this page.",
	malformed_cookie:
		"The temporary connection data was incomplete. Restart the connection from this page.",
	state_mismatch:
		"The connection state did not match. Restart the connection from this page.",
	user_mismatch:
		"The signed-in Grabbin account changed. Sign in to the same account and try again.",
	signature_mismatch:
		"The connection could not be verified. Restart the connection from this page.",
	pro_required: "Upgrade to Pro to connect your Calendly account.",
	token_exchange:
		"Calendly approved the connection, but Grabbin could not exchange the access code.",
	save_connection:
		"Calendly connected, but Grabbin could not save the connection.",
};

export const calendlyConnectionErrorFallback =
	"Could not connect Calendly. Please try again.";
