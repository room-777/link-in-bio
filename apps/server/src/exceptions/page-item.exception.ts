export type PageItemServiceErrorCode =
	| "PAGE_NOT_FOUND"
	| "DUPLICATE_ITEM_ID"
	| "CONFLICTING_ITEM_OPERATION"
	| "ITEM_ID_ALREADY_CLAIMED"
	| "ITEM_TYPE_IMMUTABLE"
	| "ITEM_NOT_FOUND"
	| "INVALID_ITEM_LAYOUT"
	| "INVALID_MEDIA_KEY"
	| "INVALID_MEDIA_UPLOAD"
	| "ITEM_MEDIA_NOT_FOUND"
	| "CONCURRENT_ITEM_UPDATE";

export class PageItemServiceError extends Error {
	constructor(public readonly code: PageItemServiceErrorCode) {
		super(code);
	}
}
