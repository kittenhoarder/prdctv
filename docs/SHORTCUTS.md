# Known Shortcuts & Hardening Queue

Ship fast; document what we skipped so it's a conscious choice.

| Shortcut | Risk | When to Fix |
|----------|------|--------------|
| No auth | Anyone with link can read or edit | Before external users |
| No CAPTCHA on Mirror respond | Bot submissions can skew overlay | Before 100 users |
| IP-only rate limiting | Easy to bypass with VPN or proxies | Before 100 users |
| No streaming for AI | Slower perceived response | Before 100 users |
| No retry on DB connection loss | Transient DB errors surface as 500 | Before 100 users |
| No audit log | Cannot trace who did what | Before enterprise |
| No data export/deletion flow | GDPR/compliance gap | Before enterprise |
| No accessibility audit beyond contrast | Possible WCAG failures | Before 100 users |
| No i18n | English-only | Before enterprise |
| No mobile-specific testing | Layout/UX bugs on small screens | Before 100 users |
| Mirror cap only per-session (50) | Determined actor can create many sessions | Before 100 users |
| ~~No secret scanning in CI~~ | ~~Credentials could be committed~~ | **Fixed:** Gitleaks v8.21.0 in CI (`--no-git`, current state only) |

**When to Fix** tiers:

- **Before external users** — must be addressed before anyone outside the team uses it.
- **Before 100 users** — important but not blocking for dogfooding.
- **Before enterprise** — only matters at scale or in compliance contexts.
