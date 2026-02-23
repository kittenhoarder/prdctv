# Frame + Mirror

Meeting preparation and communication feedback in one app.

- **Frame** — 3-minute structured input → 3 AI clarifying questions → shareable 1-page Frame Brief
- **Mirror** — communicator intent + audience reception → overlay showing top gaps + follow-up message

## Tech stack

- Next.js 15.5.x (App Router, TypeScript)
- shadcn/ui, Tailwind CSS v4, dark-mode-first
- Neon Postgres (serverless) + Drizzle ORM
- OpenRouter (AI provider, abstracted — swappable)
- Vercel deployment

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
| `OPENROUTER_API_KEY` | OpenRouter API key (https://openrouter.ai/keys) |
| `AI_PROVIDER` | `openrouter` or `stub` (stub returns demo data, no API calls) |
| `ENABLE_MIRROR` | `true` / `false` — feature flag for Mirror module |
| `ENABLE_AI` | `true` / `false` — when false, AI endpoints return demo data |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional — disables rate limiting if blank) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret to protect the cleanup cron endpoint |

### 3. Set up the database

```bash
# Push schema to Neon (first time)
DATABASE_URL=your-url npm run db:push

# Or generate and apply migrations
DATABASE_URL=your-url npm run db:generate
DATABASE_URL=your-url npm run db:migrate
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Testing without a database

Set `AI_PROVIDER=stub` and `ENABLE_AI=false` in `.env.local`. The stub adapter returns realistic demo data. **You still need a real database** — the stub only replaces AI calls, not DB queries.

For rapid local iteration without Neon, you can run a local Postgres instance and use `drizzle-kit push` to apply the schema.

## Project structure

```
src/
  app/
    api/
      frame/           POST /api/frame, GET/questions/answers/brief
      mirror/          POST /api/mirror, GET/respond/overlay
      cron/cleanup     Daily TTL cleanup
    frame/[token]/     questions, brief, view pages
    mirror/[mtoken]/   respond, overlay pages
  components/
    ui/                shadcn components
    brief-display.tsx  Shared brief renderer
  lib/
    ai/                Provider interface + OpenRouter adapter + stub
    db/                Drizzle schema + connection
    env.ts             Zod-validated env config
    logger.ts          Structured JSON logging
    sanitize.ts        Input sanitization
    tokens.ts          nanoid token generation + TTL
```

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars in Vercel dashboard
4. Vercel Cron is configured in `vercel.json` — runs cleanup at 03:00 UTC daily

## Feature flags

| Flag | Effect |
|---|---|
| `ENABLE_MIRROR=false` | Disables Mirror routes entirely |
| `ENABLE_AI=false` | All AI endpoints return hardcoded demo data |

## Rollback

- Vercel instant rollback via the Deployments dashboard
- Schema changes are additive-only — no destructive migrations
- Truncating tables has no lasting consequence (ephemeral data, 7-day TTL)

## Smoke tests

Before each deploy, verify:

1. `/` → "Small Meeting" → complete Frame flow → brief renders
2. Copy share link → open incognito → read-only brief renders
3. `/` → "Presentation" → complete Frame + intent fields
4. Open audience link → submit response
5. Submit 3+ responses → generate overlay → divergences display
6. Access expired token → shows expired message
7. AI generation shows skeleton → renders result
8. Tab through all forms → all fields reachable, Enter submits
