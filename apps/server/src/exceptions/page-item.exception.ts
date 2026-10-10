export type PageItemServiceErrorCode =
	| "PAGE_NOT_FOUND"
	| "INVALID_ITEM_BATCH"
	| "DUPLICATE_ITEM_ID"
	| "CONFLICTING_ITEM_OPERATION"
	| "ITEM_ID_ALREADY_CLAIMED"
	| "ITEM_TYPE_IMMUTABLE"
	| "ITEM_NOT_FOUND"
	| "INVALID_ITEM_LAYOUT"
	| "INVALID_MEDIA_KEY"
	| "INVALID_MEDIA_UPLOAD"
	| "ITEM_MEDIA_NOT_FOUND"
	| "CONCURRENT_ITEM_UPDATE"
	| "INVALID_LINK_METADATA"
	| "UPSTREAM_RATE_LIMITED"
	| "ITEM_NOT_LINK"
	| "STALE_LINK_METADATA";

export class PageItemServiceError extends Error {
	constructor(
		public readonly code: PageItemServiceErrorCode,
		public readonly retryAfter?: string,
	) {
		super(code);
	}
}
