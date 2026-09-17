import { env } from "@my-better-t-app/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "./schema";

export async function createDb() {
	const client = new Client({
		connectionString: env.HYPERDRIVE.connectionString,
		...(env.DATABASE_SSL_REJECT_UNAUTHORIZED
			? {
					ssl: {
						rejectUnauthorized:
							env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
					},
				}
			: {}),
	});
	await client.connect();

	return drizzle({ client, schema });
}
