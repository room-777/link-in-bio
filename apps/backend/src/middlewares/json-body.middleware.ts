import type { AppEnv } from "@core/app-factory";
import type { MiddlewareHandler } from "hono";
import * as v from "valibot";
import { UnprocessableEntityError } from "../exceptions/http-exceptions";

type JsonBodyInput<T> = {
	in: { json: T };
	out: { json: T };
};

export const jsonBody =
	<Schema extends v.GenericSchema>(
		schema: Schema,
		message: string,
		code: string,
	): MiddlewareHandler<
		AppEnv,
		string,
		JsonBodyInput<v.InferOutput<Schema>>
	> =>
	async (c, next) => {
		let input: unknown;
		try {
			input = await c.req.json();
		} catch {
			throw new UnprocessableEntityError(
				message,
				code,
			);
		}

		const parsed = v.safeParse(
			schema,
			input,
		);
		if (!parsed.success)
			throw new UnprocessableEntityError(
				message,
				code,
			);

		c.req.addValidatedData(
			"json",
			parsed.output as object,
		);
		await next();
	};
