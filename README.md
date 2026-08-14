# BGSU SRC — Equipment Operations

Equipment tracker for the BGSU Student Recreation Center: a live facility map of all 208 machines across three levels, downtime logging with cause tracking, repair costs, MTTR/MTBF metrics, warranty alerts, and full audit trail.

Built per `docs/project-spec.md`. Manual research for all 65 brand/model combinations lives in `docs/manual-research.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma 7 + Neon Postgres (`@prisma/adapter-pg`)
- Custom auth: scrypt password hashing, HMAC session cookie (no session table), fixed daily expiry, login rate limiting, CSRF origin checks
- Vercel hosting; daily cron (`/api/cron/alerts`) for warranty (30/60/90-day) and 5%-downtime flags — email delivery is stubbed behind `src/lib/notify.ts` until a provider is wired in

## The map

The facility map renders the three equipment levels (Entry, Balcony, Lower Level II) as an exploded 2.5D stack. Level geometry in `src/data/floorplans.ts` was extracted from BGSU's official floor-plan images (`public/floorplans/`) via color segmentation + contour tracing (workspace in `tools/trace/`). Pin positions are normalized against the source image space; drag pins in "Arrange" mode to place machines where they physically sit.

## Development

```
npm install
npx prisma migrate dev   # needs DATABASE_URL + DIRECT_URL in .env
npx tsx scripts/create-user.ts you@example.com "Your Name"
npm run dev
```

`.env` needs: `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct, for migrations), `SESSION_SECRET`. Production also uses `CRON_SECRET`.

One-time data import (idempotent — never clobbers in-app edits):

```
npx tsx scripts/import-inventory.ts
```

Imports `data/equipment-inventory.xlsx` (208 rows) and applies the spec §15 cleanup corrections from the manual research (brand fix on the mislabeled Nautilus hack squat, official model codes, manual links, nameplate-audit flags).
