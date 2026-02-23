import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  AI_PROVIDER: z.enum(["openrouter", "stub"]).default("openrouter"),
  ENABLE_MIRROR: z
    .string()
    .transform((v) => v !== "false")
    .pipe(z.boolean())
    .default(true),
  ENABLE_AI: z
    .string()
    .transform((v) => v !== "false")
    .pipe(z.boolean())
    .default(true),
  CRON_SECRET: z.string().optional(),
});

// Validate at module load — fails fast on missing config
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const missing = _env.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Missing or invalid environment variables: ${missing}`);
}

export const env = _env.data;
