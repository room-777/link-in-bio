import { HTTPException } from "hono/http-exception";

export class NotFoundError extends HTTPException {
	constructor(resource: string) {
		super(404, {
			message: `${resource} not found`,
		});
	}
}

export class UnauthorizedError extends HTTPException {
	constructor() {
		super(401, {
			message: "Unauthorized",
		});
	}
}

export class ForbiddenError extends HTTPException {
	constructor(
		message = "Forbidden",
		code = "FORBIDDEN",
	) {
		super(403, { message });
		this.code = code;
	}

	code: string;
}

export class ConflictError extends HTTPException {
	constructor(
		message = "Conflict",
		code = "CONFLICT",
	) {
		super(409, { message });
		this.code = code;
	}

	code: string;
}

export class UnprocessableEntityError extends HTTPException {
	constructor(
		message = "Unprocessable Entity",
		code = "UNPROCESSABLE_ENTITY",
	) {
		super(422, { message });
		this.code = code;
	}

	code: string;
}
