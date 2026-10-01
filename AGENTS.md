# AGENTS.md — Tessera

Continue from the roadmap in **PLAN.md** (milestone 1 complete).

## Architecture
- `src/routes/` — `index.tsx` (landing), `app.tsx` (console layout + New ticket dialog, `c` shortcut), `app.index.tsx` (live queue, `?ticket=` opens drawer), `app.forecast.tsx` (forecast).
- `src/components/ui.tsx` — design primitives (Wordmark, Watermark, Reveal, StagePill/Track, PriorityMark, SlaMeter, Avatar, Toaster, EmptyState).
- `src/components/charts.tsx` — custom SVG charts (no chart library used; chart.js is a leftover dependency).
- `src/components/console/` — TicketDrawer, NewTicketDialog.
- `src/lib/fixtures.ts` — ALL stub data, seeded PRNG at fixed `SNAPSHOT` time (avoids hydration drift). Swap for DB later.
- `src/lib/store.ts` — TanStack Store; action signatures mirror the future API.
- `src/lib/forecast.ts` — Holt-Winters (4-week season) + event multipliers.
- `src/lib/triage.ts` — keyword triage placeholder for an AI Gateway call.
- `src/lib/img.ts` — Netlify Image CDN helpers; images in `public/img/`.

## Conventions
- Tokens live in `@theme` in `styles.css` (bone/ink/ember palette; Instrument Serif + Geist).
- Scroll reveals only hide content when `js-reveal` class is set; respect reduced motion.
- The "Caleb Krewu" watermark (bottom-left) must remain on every page.
