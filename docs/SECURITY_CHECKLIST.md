# Security Checklist (MVP-Grade)

Exactly 6 items. Verify each; apply the fix if it fails.

| # | What to verify | How to verify | Fix if it fails |
|---|----------------|---------------|------------------|
| 1 | **Prompt injection** — user text never executable as instructions | Test Frame context and Mirror response fields with input like `"Ignore all previous instructions and..."`; confirm model still follows system prompt and output matches schema | Strict prompt structure: all user content in `<user_input>...</user_input>` ([src/lib/ai/prompts.ts](../src/lib/ai/prompts.ts)); Zod output validation in OpenRouter adapter |
| 2 | **API key exposure** | Search Vercel build output (e.g. `.next/static/`) for `OPENROUTER` or the key prefix; confirm key never in client bundles or error response bodies | Key only in server env; never import or pass to client components; catch errors and return generic message |
| 3 | **Token unguessability** | Confirm tokens are `nanoid(21)` (~126 bits); use timing-safe comparison on lookup | [src/lib/tokens.ts](../src/lib/tokens.ts): `nanoid(21)`; `timingSafeEqualToken` used after DB lookup in shared routes |
| 4 | **No PII in logs** | Grep logs for raw user text, email, names; only hashed session IDs and structural metadata allowed | Logger accepts only event + opaque IDs/counts; never log request body or AI payload content ([src/lib/logger.ts](../src/lib/logger.ts)) |
| 5 | **Mirror submission abuse** | Check cap (max 50 audience responses per mtoken) and debounce on POST `/api/mirror/[mtoken]/respond` | [src/app/api/mirror/[mtoken]/respond/route.ts](../src/app/api/mirror/[mtoken]/respond/route.ts): 50-response cap and 2s debounce per mtoken |
| 6 | **Data expiry** | Confirm 7-day expiry actually removes or hides data (cron or query filter), not only the link | [src/app/api/cron/cleanup/route.ts](../src/app/api/cron/cleanup/route.ts): deletes frames where `expiresAt < now`; cascade removes mirror data; shared links return 404 for expired tokens |
