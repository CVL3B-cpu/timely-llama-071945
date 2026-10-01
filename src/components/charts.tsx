import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ForecastPoint, ForecastResult } from '@/lib/forecast'
import { formatWeek } from '@/lib/forecast'
import { WEEKDAYS } from '@/lib/fixtures'
import { cn, nf } from '@/lib/format'

/* ── Measuring ────────────────────────────────────────────── */

function useWidth<T extends HTMLElement>(initial = 960) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceMax(v: number) {
  const step = Math.pow(10, Math.floor(Math.log10(v))) / 2
  return Math.ceil(v / step) * step
}

const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')

/* ── Forecast chart ───────────────────────────────────────── */

interface ForecastChartProps {
  history: ForecastResult['history']
  points: ForecastPoint[]
  height?: number
  dark?: boolean
  showFitted?: boolean
  className?: string
  label?: string
}

export function ForecastChart({ history, points, height = 360, dark = false, showFitted = true, className, label = 'Weekly ticket arrivals and forecast' }: ForecastChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = history.length + points.length
  const [active, setActive] = useState<number | null>(null)
  const narrow = width < 560
  const pad = { t: 24, r: narrow ? 12 : 20, b: 34, l: narrow ? 38 : 48 }
  const iw = Math.max(10, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b

  const { yMax, yMin } = useMemo(() => {
    const vals = [...history.map((h) => h.actual), ...points.map((p) => p.hi95)]
    const lo = Math.min(...history.map((h) => h.actual), ...points.map((p) => p.lo95))
    return { yMax: niceMax(Math.max(...vals) * 1.04), yMin: Math.max(0, Math.floor((lo * 0.82) / 100) * 100) }
  }, [history, points])

  const x = (i: number) => pad.l + (i / (n - 1)) * iw
  const y = (v: number) => pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih
  const hN = history.length
  const last = history[hN - 1]

  const actualPts: [number, number][] = history.map((h, i) => [x(i), y(h.actual)])
  const fittedPts: [number, number][] = history.flatMap((h, i) => (h.fitted == null ? [] : [[x(i), y(h.fitted)] as [number, number]]))
  const fcPts: [number, number][] = [[x(hN - 1), y(last.actual)], ...points.map((p, i) => [x(hN + i), y(p.mean)] as [number, number])]
  const band = (lo: keyof ForecastPoint, hi: keyof ForecastPoint) => {
    const top = [[x(hN - 1), y(last.actual)] as [number, number], ...points.map((p, i) => [x(hN + i), y(p[hi] as number)] as [number, number])]
    const bot = [...points.map((p, i) => [x(hN + i), y(p[lo] as number)] as [number, number])].reverse()
    return line(top) + bot.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join('') + 'Z'
  }
  const area = line(actualPts) + `L${x(hN - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`
  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks)
  const labelEvery = narrow ? 4 : n > 24 ? 3 : 2

  const ink = dark ? 'var(--color-bone)' : 'var(--color-ink)'
  const muted = dark ? 'var(--color-ash)' : 'var(--color-graphite)'
  const grid = dark ? 'rgb(243 239 231 / 0.08)' : 'rgb(21 18 15 / 0.07)'
  const gid = dark ? 'fc-area-dark' : 'fc-area'

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - pad.l) / iw) * (n - 1))
    setActive(Math.max(0, Math.min(n - 1, i)))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? hN - 1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? hN) - 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  const tip = active == null ? null : active < hN ? { kind: 'actual' as const, h: history[active] } : { kind: 'forecast' as const, p: points[active - hN] }
  const tipX = active == null ? 0 : x(active)
  const tipLeft = tipX > width - 200

  return (
    <div ref={ref} className={cn('relative select-none', className)} style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${label}. Use left and right arrow keys to inspect weeks.`}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className="block touch-pan-y overflow-visible outline-none focus-visible:[&_.focus-ring]:opacity-100"
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={dark ? '#f3efe7' : '#15120f'} stopOpacity={dark ? 0.16 : 0.09} />
            <stop offset="1" stopColor={dark ? '#f3efe7' : '#15120f'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect className="focus-ring opacity-0 transition-opacity" x={1} y={1} width={width - 2} height={height - 2} rx={12} fill="none" stroke="var(--color-ember)" strokeWidth={2} />

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={grid} />
            <text x={pad.l - 10} y={y(v)} dy="0.32em" textAnchor="end" fill={muted} className="font-mono text-[10px] tabular">
              {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : v}
            </text>
          </g>
        ))}

        {/* Forecast zone wash */}
        <rect x={x(hN - 1)} y={pad.t - 8} width={x(n - 1) - x(hN - 1) + pad.r} height={ih + 8} fill={dark ? 'rgb(226 85 43 / 0.05)' : 'rgb(226 85 43 / 0.045)'} />
        <line x1={x(hN - 1)} x2={x(hN - 1)} y1={pad.t - 12} y2={pad.t + ih} stroke={muted} strokeDasharray="2 4" />
        <text x={x(hN - 1) + 8} y={pad.t - 2} fill="var(--color-ember)" className="label">
          Forecast
        </text>

        <path d={area} fill={`url(#${gid})`} />
        <path d={band('lo95', 'hi95')} fill="var(--color-ember)" opacity={dark ? 0.14 : 0.1} />
        <path d={band('lo80', 'hi80')} fill="var(--color-ember)" opacity={dark ? 0.24 : 0.18} />

        {showFitted && <path d={line(fittedPts)} fill="none" stroke={muted} strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />}
        <path d={line(actualPts)} fill="none" stroke={ink} strokeWidth={1.75} strokeLinejoin="round" pathLength={1} className="chart-draw" />
        <path d={line(fcPts)} fill="none" stroke="var(--color-ember)" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.weekStart} cx={x(hN + i)} cy={y(p.mean)} r={3} fill={dark ? 'var(--color-ink)' : 'var(--color-paper)'} stroke="var(--color-ember)" strokeWidth={1.75} />
        ))}
        <circle cx={x(hN - 1)} cy={y(last.actual)} r={4} fill={ink} />

        {[...history.map((h) => h.weekStart), ...points.map((p) => p.weekStart)].map((wk, i) =>
          i % labelEvery === (n - 1) % labelEvery ? (
            <text key={wk} x={x(i)} y={height - 10} textAnchor="middle" fill={muted} className="font-mono text-[10px]">
              {formatWeek(wk)}
            </text>
          ) : null,
        )}

        {active != null && (
          <g pointerEvents="none">
            <line x1={tipX} x2={tipX} y1={pad.t} y2={pad.t + ih} stroke={ink} strokeOpacity={0.35} />
            <circle
              cx={tipX}
              cy={y(tip!.kind === 'actual' ? tip!.h.actual : tip!.p.mean)}
              r={5.5}
              fill={tip!.kind === 'actual' ? ink : 'var(--color-ember)'}
              stroke={dark ? 'var(--color-ink)' : 'var(--color-paper)'}
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {tip && (
        <div
          className={cn(
            'pointer-events-none absolute top-3 z-10 min-w-44 rounded-[10px] px-3.5 py-3 text-xs shadow-float',
            dark ? 'bg-bone text-ink' : 'bg-ink text-bone',
          )}
          style={{ left: tipLeft ? tipX - 12 : tipX + 12, transform: tipLeft ? 'translateX(-100%)' : undefined }}
        >
          <p className={cn('label', dark ? 'text-graphite' : 'text-ash')}>
            Week of {formatWeek(tip.kind === 'actual' ? tip.h.weekStart : tip.p.weekStart, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {tip.kind === 'actual' ? (
            <>
              <p className="mt-1.5 font-display text-2xl leading-none">{nf.format(tip.h.actual)}</p>
              <p className={cn('mt-1', dark ? 'text-graphite' : 'text-ash')}>
                tickets received{tip.h.fitted ? ` · model ${nf.format(Math.round(tip.h.fitted))}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 font-display text-2xl leading-none text-ember">{nf.format(Math.round(tip.p.mean))}</p>
              <p className={cn('mt-1', dark ? 'text-graphite' : 'text-ash')}>
                forecast · 80% {nf.format(Math.round(tip.p.lo80))}–{nf.format(Math.round(tip.p.hi80))}
              </p>
            </>
          )}
        </div>
      )}
      <style>{`.chart-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:chart-draw 1.6s var(--ease-out-expo) .15s forwards}@keyframes chart-draw{to{stroke-dashoffset:0}}`}</style>
    </div>
  )
}

/* ── Heatmap: expected arrivals by weekday × hour ─────────── */

export function ArrivalHeatmap({ heat, peak }: { heat: number[][]; peak: { day: number; hour: number } }) {
  const max = Math.max(...heat.flat())
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  const shown = hover ?? { d: peak.day, h: peak.hour }
  const color = (v: number) => {
    const t = v / max
    if (t < 0.08) return 'var(--color-bone-2)'
    if (t < 0.25) return '#efd9c9'
    if (t < 0.45) return '#f0b799'
    if (t < 0.65) return '#ea8d66'
    if (t < 0.85) return '#e2552b'
    return '#a8381a'
  }
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4" aria-live="polite">
        <p className="text-sm text-graphite">
          <span className="font-medium text-ink">
            {WEEKDAYS[shown.d]} {String(shown.h).padStart(2, '0')}:00
          </span>{' '}
          · {nf.format(Math.round(heat[shown.d][shown.h]))} tickets expected
          {!hover && <span className="text-ember-deep"> · weekly peak</span>}
        </p>
      </div>
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <div className="grid min-w-[620px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]" onPointerLeave={() => setHover(null)} role="img" aria-label={`Heatmap of expected arrivals by weekday and hour. Peak is ${WEEKDAYS[peak.day]} at ${peak.hour}:00.`}>
          {heat.map((row, d) => (
            <div key={d} className="contents">
              <span className="label self-center text-graphite">{WEEKDAYS[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  onPointerEnter={() => setHover({ d, h })}
                  className={cn(
                    'aspect-square rounded-[3px] transition-transform duration-200 hover:scale-125 hover:shadow-lift',
                    shown.d === d && shown.h === h && 'ring-2 ring-ink ring-offset-1 ring-offset-paper',
                  )}
                  style={{ background: color(v) }}
                />
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="pt-1 text-center font-mono text-[9px] text-stone">
              {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-graphite">
        <span>Quiet</span>
        <span className="flex gap-[3px]">
          {['var(--color-bone-2)', '#efd9c9', '#f0b799', '#ea8d66', '#e2552b', '#a8381a'].map((c) => (
            <span key={c} className="h-2.5 w-5 rounded-[2px]" style={{ background: c }} />
          ))}
        </span>
        <span>Peak</span>
      </div>
    </div>
  )
}

/* ── Daily range bars with staffing overlay ───────────────── */

export function DailyBars({ daily, staffing, capacityPerAgent }: { daily: ForecastResult['next']['daily']; staffing: ForecastResult['next']['staffing']; capacityPerAgent: number }) {
  const max = niceMax(Math.max(...daily.map((d) => d.hi), ...staffing.map((s) => s.scheduled * capacityPerAgent)) * 1.05)
  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-4" role="list">
      {daily.map((d, i) => {
        const cap = staffing[i].scheduled * capacityPerAgent
        const short = staffing[i].gap < 0
        return (
          <div key={d.day} role="listitem" className="group flex flex-col items-center" aria-label={`${WEEKDAYS[d.day]}: ${Math.round(d.mean)} tickets forecast, capacity ${cap}`}>
            <div className="relative h-48 w-full sm:h-56">
              {/* capacity marker */}
              <span className="absolute inset-x-0 border-t border-dashed border-graphite/50" style={{ bottom: `${(cap / max) * 100}%` }} />
              {/* range whisker */}
              <span className="absolute left-1/2 w-px -translate-x-1/2 bg-ink/30" style={{ bottom: `${(d.lo / max) * 100}%`, height: `${((d.hi - d.lo) / max) * 100}%` }} />
              <span
                className={cn(
                  'absolute bottom-0 left-1/2 w-[62%] max-w-10 -translate-x-1/2 origin-bottom rounded-t-[6px] transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:w-[72%]',
                  short ? 'bg-ember' : 'bg-ink',
                )}
                style={{ height: `${(d.mean / max) * 100}%` }}
              />
            </div>
            <span className="mt-3 font-mono text-[10px] tracking-wider text-graphite uppercase">{WEEKDAYS[d.day]}</span>
            <span className="font-display text-xl leading-tight tabular">{nf.format(Math.round(d.mean))}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Sparkline ────────────────────────────────────────────── */

export function Sparkline({ values, className, stroke = 'var(--color-ink)' }: { values: number[]; className?: string; stroke?: string }) {
  const w = 96
  const h = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)] as [number, number])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-7 w-24 overflow-visible', className)} aria-hidden="true">
      <path d={line(pts)} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.4} fill={stroke} />
    </svg>
  )
}
