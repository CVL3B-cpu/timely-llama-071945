/**
 * Weekly influx forecasting.
 *
 * Multiplicative Holt-Winters (level · trend · 4-week season, matching the
 * monthly billing cycle) fitted to weekly arrivals, with empirical prediction
 * intervals from one-step-ahead residuals. Planned events are applied as
 * day-level multipliers on the next week only, so every breakdown (daily,
 * hourly, category, staffing) stays consistent with the headline number.
 */
import {
  CATEGORIES,
  HOURLY_PROFILE,
  PLANNED_EVENTS,
  SCHEDULED_AGENTS,
  TICKETS_PER_AGENT,
  WEEKDAY_SHARE,
  type Category,
  type WeekPoint,
} from './fixtures'

export type EventId = (typeof PLANNED_EVENTS)[number]['id']

export interface ForecastOptions {
  horizon: number
  /** Analyst growth adjustment, e.g. 0.05 = +5% across the horizon */
  growth: number
  events: EventId[]
}

export interface ForecastPoint {
  weekStart: string
  mean: number
  lo80: number
  hi80: number
  lo95: number
  hi95: number
}

export interface ForecastResult {
  history: { weekStart: string; actual: number; fitted: number | null }[]
  points: ForecastPoint[]
  mape: number
  accuracy: number
  next: {
    total: number
    lo: number
    hi: number
    changePct: number
    daily: { day: number; mean: number; lo: number; hi: number }[]
    heat: number[][]
    peak: { day: number; hour: number; value: number }
    categories: { category: Category; value: number; share: number; deltaPct: number }[]
    staffing: { day: number; required: number; scheduled: number; gap: number }[]
  }
}

const SEASON = 4
const ALPHA = 0.42
const BETA = 0.08
const GAMMA = 0.3
const DAY_MS = 86_400_000

/** Day-level multipliers (Mon..Sun) contributed by each planned event. */
const EVENT_EFFECTS: Record<EventId, number[]> = {
  launch: [1, 1.42, 1.3, 1.15, 1.08, 1.05, 1.05],
  billing: [1.22, 1.14, 1.04, 1, 1, 1, 1],
  holiday: [1, 1, 1, 1.04, 0.42, 0.9, 1],
}

const EVENT_CATEGORY_LIFT: Record<EventId, Partial<Record<Category, number>>> = {
  launch: { 'Access & Auth': 1.35, Integrations: 1.25, Onboarding: 1.2 },
  billing: { Billing: 1.45 },
  holiday: { Hardware: 0.8 },
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function runForecast(weeks: WeekPoint[], opts: ForecastOptions): ForecastResult {
  const y = weeks.map((w) => w.total)
  const n = y.length
  if (n < SEASON * 2) throw new Error('INSUFFICIENT_HISTORY')

  // Initialisation from the first two seasons
  const s1 = mean(y.slice(0, SEASON))
  const s2 = mean(y.slice(SEASON, SEASON * 2))
  let level = s1
  let trend = (s2 - s1) / SEASON
  const season: number[] = y.slice(0, SEASON).map((v) => v / s1)

  const fitted: (number | null)[] = Array(SEASON).fill(null)
  const errors: number[] = []
  const ape: number[] = []

  for (let t = SEASON; t < n; t++) {
    const sIdx = season[t - SEASON]
    const yhat = (level + trend) * sIdx
    fitted.push(yhat)
    errors.push(y[t] - yhat)
    ape.push(Math.abs(y[t] - yhat) / y[t])

    const prevLevel = level
    level = ALPHA * (y[t] / sIdx) + (1 - ALPHA) * (level + trend)
    trend = BETA * (level - prevLevel) + (1 - BETA) * trend
    season.push(GAMMA * (y[t] / level) + (1 - GAMMA) * sIdx)
  }

  // Backtest over the most recent 8 one-step forecasts
  const recentApe = ape.slice(-8)
  const mape = mean(recentApe)
  const sd = Math.sqrt(mean(errors.slice(-12).map((e) => e * e)))

  const lastStart = new Date(weeks[n - 1].weekStart + 'T00:00:00Z').getTime()
  const eventMultiplier = weekEventMultiplier(opts.events)

  const points: ForecastPoint[] = []
  for (let h = 1; h <= opts.horizon; h++) {
    const s = season[n - SEASON + ((h - 1) % SEASON)]
    let m = (level + h * trend) * s * (1 + opts.growth * (h / opts.horizon))
    if (h === 1) m *= eventMultiplier
    const spread = sd * Math.sqrt(1 + (h - 1) * 0.35) * (h === 1 && opts.events.length ? 1.15 : 1)
    points.push({
      weekStart: new Date(lastStart + h * 7 * DAY_MS).toISOString().slice(0, 10),
      mean: m,
      lo80: m - 1.2816 * spread,
      hi80: m + 1.2816 * spread,
      lo95: m - 1.96 * spread,
      hi95: m + 1.96 * spread,
    })
  }

  const history = weeks.map((w, i) => ({ weekStart: w.weekStart, actual: w.total, fitted: fitted[i] ?? null }))
  return { history, points, mape, accuracy: 1 - mape, next: breakdown(weeks, points[0], opts.events) }
}

function weekEventMultiplier(events: EventId[]) {
  let weighted = 0
  WEEKDAY_SHARE.forEach((share, d) => {
    let m = 1
    for (const e of events) m *= EVENT_EFFECTS[e][d]
    weighted += share * m
  })
  return weighted
}

function breakdown(weeks: WeekPoint[], p: ForecastPoint, events: EventId[]): ForecastResult['next'] {
  // Daily distribution: base share × event effects, renormalised to the week total
  const raw = WEEKDAY_SHARE.map((share, d) => {
    let m = 1
    for (const e of events) m *= EVENT_EFFECTS[e][d]
    return share * m
  })
  const rawSum = raw.reduce((a, b) => a + b, 0)
  const width = (p.hi80 - p.lo80) / 2
  const daily = raw.map((r, d) => {
    const share = r / rawSum
    return { day: d, mean: p.mean * share, lo: (p.mean - width) * share, hi: (p.mean + width) * share }
  })

  const hourSum = HOURLY_PROFILE.reduce((a, b) => a + b, 0)
  const heat = daily.map((d) => HOURLY_PROFILE.map((h) => (d.mean * h) / hourSum))
  let peak = { day: 0, hour: 0, value: 0 }
  heat.forEach((row, d) => row.forEach((v, h) => { if (v > peak.value) peak = { day: d, hour: h, value: v } }))

  // Category mix from trailing 4 weeks, lifted by events
  const recent = weeks.slice(-4)
  const last = weeks[weeks.length - 1]
  const weights = CATEGORIES.map((c) => {
    let w = mean(recent.map((wk) => wk.byCategory[c] / wk.total))
    for (const e of events) w *= EVENT_CATEGORY_LIFT[e][c] ?? 1
    return w
  })
  const wSum = weights.reduce((a, b) => a + b, 0)
  const categories = CATEGORIES.map((c, i) => {
    const value = (p.mean * weights[i]) / wSum
    return { category: c, value, share: weights[i] / wSum, deltaPct: value / last.byCategory[c] - 1 }
  }).sort((a, b) => b.value - a.value)

  const staffing = daily.map((d) => {
    const required = Math.ceil(d.mean / TICKETS_PER_AGENT)
    return { day: d.day, required, scheduled: SCHEDULED_AGENTS[d.day], gap: SCHEDULED_AGENTS[d.day] - required }
  })

  return {
    total: p.mean,
    lo: p.lo80,
    hi: p.hi80,
    changePct: p.mean / last.total - 1,
    daily,
    heat,
    peak,
    categories,
    staffing,
  }
}

export function formatWeek(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })
}
