import { env } from "@grabbin/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "./schema";

export async function createDb() {
	const client = new Client({
		connectionString: env.HYPERDRIVE.connectionString,
	});
	await client.connect();

	return drizzle({ client, schema });
}
