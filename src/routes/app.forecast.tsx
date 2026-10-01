import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Info, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { PLANNED_EVENTS, TICKETS_PER_AGENT, WEEKDAYS, WEEKLY_HISTORY } from '@/lib/fixtures'
import { formatWeek, runForecast, type EventId, type ForecastResult } from '@/lib/forecast'
import { cn, nf, pct } from '@/lib/format'
import { ArrivalHeatmap, DailyBars, ForecastChart } from '@/components/charts'
import { EmptyState } from '@/components/ui'
import { toast } from '@/lib/store'

export const Route = createFileRoute('/app/forecast')({
  head: () => ({ meta: [{ title: 'Forecast — Tessera' }] }),
  component: ForecastPage,
})

const HORIZONS = [4, 6, 8] as const
const WINDOWS = [12, 16, 20] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ForecastPage() {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(6)
  const [window, setWindow] = useState<(typeof WINDOWS)[number]>(20)
  const [growth, setGrowth] = useState(0)
  const [events, setEvents] = useState<EventId[]>(['launch'])
  const [showFit, setShowFit] = useState(true)

  const result = useMemo<ForecastResult | null>(() => {
    try {
      return runForecast(WEEKLY_HISTORY.slice(-window), { horizon, growth: growth / 100, events })
    } catch {
      return null
    }
  }, [horizon, growth, events, window])

  const toggle = (id: EventId) => setEvents((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
  const reset = () => {
    setHorizon(6)
    setWindow(20)
    setGrowth(0)
    setEvents([])
  }
  const dirty = horizon !== 6 || window !== 20 || growth !== 0 || events.length > 0

  if (!result) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8 lg:px-12">
        <EmptyState title="Not enough history yet." body="Tessera needs at least eight weeks of arrivals to learn your queue's rhythm. Forecasts appear automatically once that history exists." />
      </div>
    )
  }

  const { next } = result
  const nextWeek = result.points[0].weekStart
  const up = next.changePct >= 0
  const shortDays = next.staffing.filter((s) => s.gap < 0)

  const exportCsv = () => {
    const rows = [
      ['week_start', 'type', 'value', 'lo80', 'hi80', 'lo95', 'hi95'],
      ...result.history.map((h) => [h.weekStart, 'actual', h.actual, '', '', '', '']),
      ...result.points.map((p) => [p.weekStart, 'forecast', Math.round(p.mean), Math.round(p.lo80), Math.round(p.hi80), Math.round(p.lo95), Math.round(p.hi95)]),
    ]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tessera-forecast-${nextWeek}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Forecast exported', body: `${result.points.length} forecast weeks, ${result.history.length} actuals`, tone: 'success' })
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-24 sm:px-8 lg:px-12 lg:pt-12">
      {/* Masthead */}
      <header className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <p className="label text-graphite">Weekly influx forecast · week of {formatWeek(nextWeek, { day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-4 font-display text-display leading-[0.95]">
            Next week,
            <br />
            <span className="text-ember-deep">
              <AnimatedNumber value={next.total} />
            </span>{' '}
            <span className="italic">tickets.</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-graphite">
            <span className={cn('flex items-center gap-1.5 font-medium', up ? 'text-ember-deep' : 'text-[#3c5b40]')}>
              {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {pct(next.changePct, 1)} vs last week
            </span>
            <span>
              80% likely between <span className="text-ink tabular">{nf.format(Math.round(next.lo))}</span> and{' '}
              <span className="text-ink tabular">{nf.format(Math.round(next.hi))}</span>
            </span>
            <span>
              Peak <span className="text-ink">{DAY_NAMES[next.peak.day]} {String(next.peak.hour).padStart(2, '0')}:00</span>
            </span>
          </div>
        </div>

        {/* Scenario controls */}
        <aside aria-labelledby="scenario-h" className="rounded-[20px] bg-ink p-5 text-bone shadow-float sm:p-6">
          <div className="flex items-center justify-between">
            <h2 id="scenario-h" className="label text-ash">
              Scenario
            </h2>
            <button onClick={reset} disabled={!dirty} className="flex items-center gap-1.5 text-xs text-ash transition-colors hover:text-bone disabled:opacity-40">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-2 text-xs text-ash">Planned events next week</legend>
            <div className="space-y-1.5">
              {PLANNED_EVENTS.map((e) => {
                const on = events.includes(e.id)
                return (
                  <label key={e.id} className={cn('flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ember', on ? 'bg-white/10' : 'hover:bg-white/5')}>
                    <input type="checkbox" checked={on} onChange={() => toggle(e.id)} className="sr-only" />
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors', on ? 'border-ember bg-ember' : 'border-white/30')}>
                      {on && <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.2 2L9.5 3.5" /></svg>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{e.label}</span>
                      <span className="block truncate text-xs text-ash">{e.detail}</span>
                    </span>
                    <span className={cn('font-mono text-xs', e.lift > 0 ? 'text-ember-soft' : 'text-sage-soft')}>{pct(e.lift)}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="growth" className="text-ash">
                Growth adjustment
              </label>
              <span className="font-mono tabular">{growth > 0 ? '+' : ''}{growth}%</span>
            </div>
            <input id="growth" type="range" min={-15} max={15} step={1} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="mt-2 w-full" aria-valuetext={`${growth} percent`} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Segmented label="Horizon" value={horizon} options={HORIZONS} suffix="w" onChange={setHorizon} />
            <Segmented label="Training" value={window} options={WINDOWS} suffix="w" onChange={setWindow} />
          </div>
        </aside>
      </header>

      {/* Main chart */}
      <section aria-labelledby="chart-h" className="mt-12 rounded-[24px] bg-paper p-4 shadow-hair sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
          <div>
            <h2 id="chart-h" className="font-display text-3xl">
              Arrivals, actual and projected
            </h2>
            <p className="mt-1 text-sm text-graphite">
              {window} weeks of history · {horizon}-week horizon · hover or use arrow keys to inspect
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-graphite">
            <LegendItem className="h-[2px] w-5 bg-ink" label="Actual" />
            <LegendItem className="h-[2px] w-5 bg-ember [mask:repeating-linear-gradient(90deg,#000_0_5px,transparent_5px_9px)]" label="Forecast" />
            <LegendItem className="h-2.5 w-4 rounded-[2px] bg-ember/25" label="80% · 95%" />
            <button onClick={() => setShowFit((s) => !s)} aria-pressed={showFit} className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors', showFit ? 'bg-bone-2 text-ink' : 'text-graphite hover:text-ink')}>
              <span className="h-px w-4 border-t border-dashed border-graphite" /> Model fit
            </button>
          </div>
        </div>
        <ForecastChart history={result.history} points={result.points} showFitted={showFit} height={380} />
      </section>

      {/* Week breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="daily-h" className="rounded-[24px] bg-paper p-5 shadow-hair sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="daily-h" className="font-display text-3xl">
                Day by day
              </h2>
              <p className="mt-1 max-w-[44ch] text-sm text-graphite">Expected tickets with 80% range. Dashed line marks scheduled capacity at {TICKETS_PER_AGENT} tickets per agent.</p>
            </div>
          </div>
          <div className="mt-8">
            <DailyBars daily={next.daily} staffing={next.staffing} capacityPerAgent={TICKETS_PER_AGENT} />
          </div>
          <div className={cn('mt-8 rounded-[14px] p-4 text-sm', shortDays.length ? 'bg-ember-wash text-ember-deep' : 'bg-sage-soft text-[#2f4a33]')} role="status">
            {shortDays.length ? (
              <>
                <strong className="font-medium">Staffing gap on {shortDays.map((s) => WEEKDAYS[s.day]).join(', ')}.</strong>{' '}
                Add {shortDays.reduce((a, s) => a - s.gap, 0)} agent-shifts to keep first response under target.
              </>
            ) : (
              <>
                <strong className="font-medium">Fully covered.</strong> Scheduled capacity meets forecast demand every day next week.
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="heat-h" className="rounded-[24px] bg-paper p-5 shadow-hair sm:p-8">
          <h2 id="heat-h" className="font-display text-3xl">
            When it lands
          </h2>
          <p className="mt-1 mb-8 text-sm text-graphite">Expected arrivals by hour, UTC.</p>
          <ArrivalHeatmap heat={next.heat} peak={next.peak} />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Category mix */}
        <section aria-labelledby="mix-h" className="rounded-[24px] bg-paper p-5 shadow-hair sm:p-8">
          <h2 id="mix-h" className="font-display text-3xl">
            What it's about
          </h2>
          <p className="mt-1 text-sm text-graphite">Projected category mix versus last week.</p>
          <ul className="mt-8 space-y-5">
            {next.categories.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span>{c.category}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono tabular">{nf.format(Math.round(c.value))}</span>
                    <span className={cn('w-14 text-right font-mono text-xs tabular', c.deltaPct > 0.05 ? 'text-ember-deep' : c.deltaPct < -0.05 ? 'text-[#3c5b40]' : 'text-graphite')}>{pct(c.deltaPct)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bone-2">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${(c.share / next.categories[0].share) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Model card */}
        <section aria-labelledby="model-h" className="grain relative overflow-hidden rounded-[24px] bg-ink p-5 text-bone shadow-float sm:p-8">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-ember/20 blur-[90px]" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <h2 id="model-h" className="font-display text-3xl">
                How this was made
              </h2>
              <button onClick={exportCsv} className="btn btn-sm btn-ghost-dark shrink-0">
                <Download className="size-4" /> CSV
              </button>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7">
              <Stat k="Backtest accuracy" v={`${(result.accuracy * 100).toFixed(1)}%`} note={`MAPE ${(result.mape * 100).toFixed(1)}% · last 8 weeks`} />
              <Stat k="Training window" v={`${window} wks`} note={`${formatWeek(result.history[0].weekStart)} – ${formatWeek(result.history[result.history.length - 1].weekStart)}`} />
              <Stat k="Seasonality" v="4-week" note="Monthly billing cycle detected" />
              <Stat k="Refreshed" v="06:00" note="Nightly, UTC" />
            </dl>
            <p className="mt-8 flex gap-3 border-t hairline-dark pt-6 text-sm leading-relaxed text-bone/70">
              <Info className="mt-0.5 size-4 shrink-0 text-ember" />
              Holt-Winters exponential smoothing with a multiplicative season, plus day-level adjustments for planned events. Intervals come from the model's own one-step-ahead errors, so they widen honestly as the horizon grows.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function Segmented<T extends number>({ label, value, options, suffix, onChange }: { label: string; value: T; options: readonly T[]; suffix: string; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-xs text-ash">{label}</p>
      <div className="flex rounded-full bg-white/[0.07] p-0.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} aria-pressed={value === o} className={cn('h-7 flex-1 rounded-full font-mono text-xs transition-colors', value === o ? 'bg-bone text-ink' : 'text-ash hover:text-bone')}>
            {o}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  )
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={className} />
      {label}
    </span>
  )
}

function Stat({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div>
      <dt className="text-xs text-ash">{k}</dt>
      <dd className="mt-2 font-display text-4xl leading-none tabular">{v}</dd>
      <dd className="mt-1.5 text-xs text-ash">{note}</dd>
    </div>
  )
}

/** Tweens between values so scenario changes feel continuous. */
function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      from.current = value
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700)
      const e = 1 - Math.pow(1 - k, 4)
      const v = a + (value - a) * e
      setShown(v)
      from.current = v
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span className="tabular" aria-label={nf.format(Math.round(value))}>
      {nf.format(Math.round(shown))}
    </span>
  )
}
