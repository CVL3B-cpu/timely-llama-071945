# Tessera — Intelligent ticket operations

An AI smart ticketing system that monitors every ticket's progress and forecasts weekly ticket influx from historical analytics.

**Stack:** TanStack Start, React 19, Tailwind CSS 4 (custom design tokens in `src/styles.css`), hand-built SVG charts, Netlify (Image CDN, platform primitives).

## Run locally
```bash
pnpm install
netlify dev   # or pnpm dev
```

## Screens
- `/` — landing page
- `/app` — live queue console
- `/app/forecast` — weekly influx forecast

## Roadmap
See [PLAN.md](PLAN.md): persistence, auth, ingestion, model-driven triage, scheduled forecasting, more screens.
