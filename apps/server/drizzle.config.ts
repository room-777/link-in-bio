import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dbCredentials: {
		url: "postgresql://postgres.calfhbdmeaylknoqcwqq:jtotyzh208051@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
  },
  out: "./drizzle",
	schema: "./src/db/schema.ts",
  dialect: "postgresql",
});
