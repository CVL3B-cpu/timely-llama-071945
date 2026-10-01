# Tessera — Product roadmap

1. **Product surface (done)** — Editorial landing page, Live queue console (list/board, filters, search, SLA meters, ticket drawer with stage stepper, assignment, notes, timeline), New ticket form with validation and live triage suggestion, Weekly forecast (Holt-Winters model, scenario controls, daily staffing, hourly heatmap, category mix, CSV export), design tokens, Caleb Krewu watermark. Data is stubbed in `src/lib/fixtures.ts`.
2. **Data model** — Netlify Database (Drizzle) tables for tickets, events, agents, weekly arrivals; replace fixtures and `src/lib/store.ts` actions with server functions.
3. **Auth & roles** — Netlify Identity; agent/supervisor/admin roles; protect `/app`.
4. **Ingestion** — Email/portal/API intake endpoints; Netlify Forms customer portal.
5. **AI triage** — Replace `src/lib/triage.ts` with an AI Gateway model call; summaries, sentiment, suggested replies.
6. **Forecast pipeline** — Scheduled function aggregating weekly arrivals nightly and persisting forecasts; accuracy tracking.
7. **Roadmap screens** — Customers, Automations, Knowledge base, Reports.
