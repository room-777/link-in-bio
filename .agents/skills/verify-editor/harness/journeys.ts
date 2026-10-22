/**
 * Every mapped journey, one spec file each (`journeys/<id>.journey.ts`) and
 * one feature map each (`features/<id>.md`). Journey N (1-based) gets the
 * seeded owner `featuremap-test-jN`; `featuremap-test-j0` warms the editor.
 */
export const JOURNEYS = [
	"sign-in-email-otp",
	"editor-page-sharing",
	"editor-profile-and-handle",
	"editor-add-item",
	"editor-text-formatting",
	"editor-layout",
	"editor-inline-destination-url",
	"editor-link-metadata",
	"editor-link-card-images",
	"editor-advanced-widgets",
	"editor-map-editing",
	"editor-tweet",
	"editor-media-upload",
	"editor-media-editing",
] as const;

export type JourneyId = (typeof JOURNEYS)[number];
