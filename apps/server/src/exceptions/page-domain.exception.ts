export type PageDomainErrorCode =
	| "DOMAIN_INVALID"
	| "DOMAIN_TAKEN"
	| "PAGE_DOMAIN_EXISTS"
	| "DOMAIN_NOT_FOUND"
	| "PAGE_NOT_FOUND"
	| "PRO_REQUIRED"
	| "DOMAIN_CHECK_RATE_LIMITED"
	| "DOMAIN_NOT_CONFIGURED"
	| "DOMAIN_PROVIDER_UNAVAILABLE";

export class PageDomainError extends Error {
	constructor(public readonly code: PageDomainErrorCode) {
		super(code);
	}
}
