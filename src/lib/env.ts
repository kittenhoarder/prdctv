import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_SITE_URL: z.string().default("https://frame-mirror.app"),
    OPENROUTER_SITE_NAME: z.string().default("Frame + Mirror"),
    AI_PROVIDER: z.enum(["mock", "openrouter"]).default("mock"),
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
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  })
  .refine(
    (data) =>
      data.AI_PROVIDER !== "openrouter" ||
      (typeof data.OPENROUTER_API_KEY === "string" && data.OPENROUTER_API_KEY.length > 0),
    { message: "OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter", path: ["OPENROUTER_API_KEY"] }
  );

// Validate at module load — fails fast on missing config
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const missing = _env.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Missing or invalid environment variables: ${missing}`);
}

export const env = _env.data;
