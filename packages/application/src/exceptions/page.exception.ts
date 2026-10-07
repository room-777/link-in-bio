export type PageServiceErrorCode =
	| "HANDLE_INVALID"
	| "HANDLE_RESERVED"
	| "HANDLE_TAKEN"
	| "PAGE_NOT_FOUND"
	| "PAGE_ALREADY_EXISTS"
	| "PAGE_LIMIT_REACHED"
	| "PRO_REQUIRED"
	| "PAGE_READ_ONLY"
	| "PRIMARY_PAGE_CANNOT_DELETE"
	| "PAGE_IMAGE_INVALID"
	| "UNIQUE_CONFLICT";

export class PageServiceError extends Error {
	constructor(public readonly code: PageServiceErrorCode) {
		super(code);
	}
}
