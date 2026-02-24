# Performance and Lighthouse

## What was fixed

- **NO_LCP:** The home hero (heading + tagline) is now server-rendered in `src/app/page.tsx` via `HeroInitial` and passed into `HomeClient` as `initialHero`. This ensures the LCP element exists in the initial HTML so Lighthouse can compute a performance score.
- **Legacy JavaScript:** A modern `browserslist` was added in `package.json` (defaults + last 2 Chrome/Safari/Firefox) to reduce polyfill transpilation. `next.config.ts` uses `optimizePackageImports` for `lucide-react` and `radix-ui` to improve tree-shaking.

## Render-blocking CSS

Lighthouse reports the main stylesheet (`_next/static/css/...css`, ~10 KiB) as render-blocking.

**Current strategy:** Documented only. Tailwind already purges unused styles, so the bundle is relatively small. No change applied.

**Future options (if we want to improve further):**

- **Critical CSS:** Inline above-the-fold CSS and defer the full stylesheet (e.g. via a Next.js plugin or build step). Requires maintaining a critical-CSS pipeline.
- **Non-blocking load:** Load the main CSS with `media="print"` and switch to `all` on load to avoid blocking first paint. Test for FOUC.

Do not regress this without updating `next.config.ts` or this doc.

## Running Lighthouse

Run Lighthouse and write the report to a file so the terminal doesn’t stall after completion (pipe to file with a completion notifier):

```bash
# Desktop (default)
npx lighthouse https://prdctv.vercel.app/ --output=json --output-path=./lighthouse/report-$(date +%Y%m%dT%H%M%S).json; echo "Lighthouse finished"

# Mobile
npx lighthouse https://prdctv.vercel.app/ --form-factor=mobile --output=json --output-path=./lighthouse/mobile-$(date +%Y%m%dT%H%M%S).json; echo "Lighthouse finished"
```

To track progress live, run in one terminal and `tail -f` the output path, or run with `--output=html` and open the report.

Verify after changes:

- Performance score is numeric (no NO_LCP).
- Render-blocking and legacy-JS insights improve as expected.
