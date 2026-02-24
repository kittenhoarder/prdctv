# Frame + Mirror

Meeting preparation and communication feedback in one app.

- **Mirror** — How your communication actually landed. State intent (3 fields), share a feedback link after your all-hands or conversation, then see the gap between what you meant and what they received. No Frame required; two-part form only.
- **Frame** — 3-minute structured input → 3 AI clarifying questions → shareable 1-page Frame Brief. Optional **Frame + Mirror** for presentations: brief plus Mirror link to capture how your message landed.

## Tech stack

- Next.js 15.5.x (App Router, TypeScript)
- shadcn/ui, Tailwind CSS v4, dark-mode-first
- Neon Postgres (serverless) + Drizzle ORM
- OpenRouter (AI provider, abstracted — swappable; free-tier with auto-discovery)
- Vercel deployment

Product taglines and shared UI copy (cold-visitor messaging, metadata descriptions) live in [`src/lib/copy.ts`](src/lib/copy.ts) so in-app and link-preview copy stay consistent.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `OPENROUTER_API_KEY` | OpenRouter API key (https://openrouter.ai/keys); required when `AI_PROVIDER=openrouter` |
| `OPENROUTER_SITE_URL` | Site URL for OpenRouter attribution (default: `https://frame-mirror.app`) |
| `OPENROUTER_SITE_NAME` | App name for OpenRouter attribution (default: `Frame + Mirror`) |
| `AI_PROVIDER` | `openrouter` or `mock` — mock returns demo data, no API calls |
| `ENABLE_MIRROR` | `true` / `false` — feature flag for Mirror module |
| `ENABLE_AI` | `true` / `false` — when false, AI endpoints return demo data |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional — disables rate limiting if blank) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret to protect the cleanup cron endpoint |

### 3. Set up the database

With `DATABASE_URL` in `.env.local`, push the schema (creates tables; no migrations yet):

```bash
npm run db:push
```

If you don’t use `.env.local`, pass the URL explicitly:

```bash
DATABASE_URL=postgresql://... npm run db:push
```

Optional: use migrations instead of push (e.g. for production history):

```bash
npm run db:generate   # writes SQL to ./drizzle
npm run db:migrate   # applies pending migrations
```

Migration `0001_mirror_frame_token_nullable.sql` makes `mirror_sessions.frame_token` nullable so Mirror can be used standalone (no Frame). Existing rows keep their `frame_token`; new Mirror-only sessions use `null`. If you set up the DB with `db:push` (so `db:migrate` was not used), apply this change with: `npx tsx scripts/apply-mirror-frame-nullable.ts` (loads `DATABASE_URL` from `.env.local`; safe to run multiple times).

Migration `0002_mirror_overlay_code_columns.sql` adds `mirror_sessions.overlay_code_hash` and `mirror_sessions.overlay_code_expires_at` (plus index `idx_mirror_overlay_code_expires`) for Mirror overlay access codes. If you set up the DB with `db:push`, apply it with: `npx tsx scripts/apply-mirror-overlay-code-columns.ts`.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Testing without a database

Set `AI_PROVIDER=mock` and `ENABLE_AI=false` in `.env.local`. The mock adapter returns realistic demo data. **You still need a real database** for the full app — the mock only replaces AI calls, not DB queries.

For rapid local iteration without Neon, run a local Postgres instance and use `drizzle-kit push` to apply the schema.

**UAT OpenRouter only (no DB):** Run the smoke script. Requires `OPENROUTER_API_KEY` and `AI_PROVIDER=openrouter` in `.env.local`. Loads `.env.local` and calls all three AI methods (questions, brief, overlay).

```bash
npx tsx scripts/smoke-openrouter.ts
```

Pipe to a file and tail for live progress: `npx tsx scripts/smoke-openrouter.ts 2>&1 | tee /tmp/smoke.log`.

## AI / OpenRouter module

The app uses **free-tier OpenRouter** with automatic model discovery and fallback. All AI flows go through the `AIProvider` interface ([`src/lib/ai/types.ts`](src/lib/ai/types.ts)); routes call `getAIProvider()` and never touch OpenRouter directly.

**When `AI_PROVIDER=openrouter`:**

- **Model discovery** — [`src/lib/ai/openrouter/model-discovery.ts`](src/lib/ai/openrouter/model-discovery.ts) fetches `GET https://openrouter.ai/api/v1/models`, caches 5 min, filters to free-tier (`:free` or zero pricing, ≤13B params).
- **Selection** — Models are scored (context length, instruct type, quality/speed heuristics). A health tracker records success/failure and rate limits per model; unhealthy or rate-limited models are excluded. Up to 3 models are sent per request in a `models: [...]` array; OpenRouter tries them in order.
- **Rate limiting** — Internal token-bucket (18 req/min, 500ms min interval) in [`src/lib/ai/openrouter/rate-limiter.ts`](src/lib/ai/openrouter/rate-limiter.ts). Complements Upstash per-IP limiting at the API layer.
- **Caching** — In-memory LRU cache (5 min TTL, 100 entries) for identical requests ([`src/lib/ai/openrouter/response-cache.ts`](src/lib/ai/openrouter/response-cache.ts)).
- **System prompt as user message** — Free-tier providers that reject `system` role receive instructions as the first `user` message; prompts still wrap user content in `<user_input>` for injection boundaries.

**Raw fallback:** If the model returns plain text or malformed JSON, the adapter does not fail. It returns `{ _raw: true, text }` and the UI renders that text in a single block (`whitespace-pre-wrap`). When the response is valid structured JSON, the existing sectioned UI (questions list, brief cards, overlay tabs) is used. See [`src/lib/ai/types.ts`](src/lib/ai/types.ts) (`RawFallback`, `isRawFallback`) and the adapter’s `fetchJson` / Zod handling in [`src/lib/ai/openrouter-adapter.ts`](src/lib/ai/openrouter-adapter.ts).

**To add a new AI task:** Extend the `AIProvider` interface and implement it in both the OpenRouter adapter and the mock adapter; add the route and UI that call `getAIProvider()`.

## Project structure

```
src/
  app/
    api/
      frame/           POST /api/frame, GET/questions/answers/brief
      mirror/          POST /api/mirror (frameToken optional), GET/respond/overlay
      feedback/        POST /api/feedback (product feedback)
      cron/cleanup     Daily TTL cleanup
    frame/[token]/     questions, brief, view pages
    mirror/            create (Mirror-only), [mtoken]/share, respond, overlay
    feedback/         Send feedback page (footer link)
  components/
    ui/                shadcn components
    brief-display.tsx  Shared brief renderer (structured or raw)
  lib/
    ai/                AIProvider interface, OpenRouter adapter, mock
    ai/openrouter/     Model discovery, scorer, health, selector, rate-limiter, cache
    db/                Drizzle schema + connection
    env.ts             Zod-validated env config
    logger.ts          Structured JSON logging
    sanitize.ts        Input sanitization
    tokens.ts          nanoid token generation + TTL
scripts/
  smoke-openrouter.ts  UAT OpenRouter (no DB); loads .env.local
  export-feedback.ts   Export product feedback from DB to JSON
```

## Product feedback

Users can submit product feedback via the "Send feedback" link (footer or `/feedback`). Submissions are stored in the `feedback` table. Export to JSON:

```bash
npx tsx scripts/export-feedback.ts
# or
npm run feedback:export
```

Pipe to a file: `npm run feedback:export > feedback-export.json`. No admin UI yet; use the script to extract.

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars in Vercel dashboard
4. Vercel Cron is configured in `vercel.json` — runs cleanup at 03:00 UTC daily
5. In the project’s **Analytics** tab, enable **Web Analytics** and **Speed Insights**; redeploy so the scripts are active. Page views and Core Web Vitals then appear in the dashboard.

## Feature flags

| Flag | Effect |
|---|---|
| `ENABLE_MIRROR=false` | Disables Mirror routes entirely |
| `ENABLE_AI=false` | All AI endpoints return hardcoded demo data |

## Rollback

- Vercel instant rollback via the Deployments dashboard
- **Analytics:** Disable in Vercel project **Analytics** tab, or remove `<Analytics />` and `<SpeedInsights />` from `src/app/layout.tsx` and redeploy
- **AI:** Set `AI_PROVIDER=mock` or `ENABLE_AI=false` to stop OpenRouter calls and return demo data
- Schema changes are additive-only — no destructive migrations
- Truncating tables has no lasting consequence (ephemeral data, 7-day TTL)

## Smoke tests

Before each deploy, verify:

1. **Mirror-only:** `/` → "Mirror" → "See how it landed" → fill 3 intent fields → share page → copy audience link → open in incognito → submit response → open overlay → generate overlay → divergences display
2. **Frame (small):** `/` → "Small Meeting" → "Start framing" → complete Frame flow → brief renders
3. Copy share link → open incognito → read-only brief renders
4. **Frame + Mirror:** `/` → "Presentation" → "Start framing" → complete Frame + intent → brief page shows Mirror links → open audience link → submit response → overlay shows divergences
5. Access expired token → shows expired message
6. AI generation shows skeleton → renders result (or raw text if model didn't return JSON)
7. Tab through all forms → all fields reachable, Enter submits

E2E tests are not yet in CI. When added, run them locally with `npm run dev` in one terminal and Playwright (or the project's E2E runner) in another.

Optional: run `npx tsx scripts/smoke-openrouter.ts` to confirm all three AI methods succeed or correctly return raw fallback when the model doesn’t return valid JSON.
