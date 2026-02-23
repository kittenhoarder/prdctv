import type { Config } from "drizzle-kit";

// Load .env.local first so db:push uses same URL as local dev
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
