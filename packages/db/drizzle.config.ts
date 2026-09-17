import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path:
		process.env.NODE_ENV === "production"
			? "../../apps/server/.env.production"
			: "../../apps/server/.env",
});

const databaseUrl =
	process.env.NODE_ENV === "production"
		? process.env.DATABASE_URL
		: (process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL);

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl ?? "",
	},
});
