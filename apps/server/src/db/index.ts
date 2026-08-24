import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { AppBindings } from "types/type";
import * as schema from "./schema";

let localPool: Pool | undefined;

export const createDatabaseClient = (
	env: AppBindings,
) => {
	const connectionString =
		env.HYPERDRIVE?.connectionString ??
		env.DATABASE_URL;

	if (!connectionString) {
		throw new Error(
			"DATABASE_URL is required",
		);
	}

	const isLocalDirectConnection =
		env.HYPERDRIVE?.connectionString ===
		env.DATABASE_URL;
	const poolConfig = {
		connectionString,
		max: 1,
		connectionTimeoutMillis: 5_000,
	};
	if (isLocalDirectConnection) {
		localPool ??= new Pool(poolConfig);
		return drizzle({
			client: localPool,
			schema,
		});
	}

	return drizzle({
		client: new Pool(poolConfig),
		schema,
	});
};

export type DatabaseClient = ReturnType<
	typeof createDatabaseClient
>;
