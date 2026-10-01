import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { SiteFooter, SiteNav, useParallax } from '@/components/site'
import { Avatar, PriorityMark, Reveal, SectionLabel, StagePill, StageTrack } from '@/components/ui'
import { ForecastChart } from '@/components/charts'
import { INITIAL_TICKETS, SNAPSHOT, STAGES, WEEKLY_HISTORY, type Stage } from '@/lib/fixtures'
import { runForecast } from '@/lib/forecast'
import { triage } from '@/lib/triage'
import { cn, nf, relTime, slaOf } from '@/lib/format'
import { cdn, srcSet } from '@/lib/img'

export const Route = createFileRoute('/')({
  component: Landing,
})

const forecast = runForecast(WEEKLY_HISTORY, { horizon: 6, growth: 0, events: [] })

function Landing() {
  return (
    <div id="top" className="bg-bone">
      <SiteNav />
      <main>
        <Hero />
        <Ticker />
        <Monitor />
        <Forecast />
        <Triage />
        <Principles />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  )
}

/* ── Hero ─────────────────────────────────────────────────── */

const HERO_STAGES: Stage[] = ['new', 'triage', 'in_progress', 'waiting', 'resolved']

function Hero() {
  const img = useParallax<HTMLDivElement>(0.12)
  const [stage, setStage] = useState(1)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setStage((s) => (s + 1) % HERO_STAGES.length), 2400)
    return () => clearInterval(id)
  }, [])
  const next = forecast.next

  return (
    <section className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#121316] text-bone" aria-labelledby="hero-title">
      <div ref={img} className="absolute inset-0 -z-10 will-change-transform">
        <img
          src={cdn('/img/hero.jpg', 1600)}
          srcSet={srcSet('/img/hero.jpg', [800, 1200, 1600, 2000])}
          sizes="100vw"
          alt=""
          width={1376}
          height={768}
          fetchPriority="high"
          className="absolute inset-0 h-[112%] w-full object-cover object-[70%_50%] opacity-90 max-md:opacity-60"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#121316_8%,rgb(18_19_22/0.7)_45%,rgb(18_19_22/0)_75%)] max-md:bg-[linear-gradient(180deg,rgb(18_19_22/0.3),#121316_85%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute -right-40 top-1/3 size-[520px] rounded-full bg-ember/20 blur-[120px]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-5 pt-32 pb-14 sm:px-8 sm:pb-20 lg:px-12">
        <p className="label flex animate-rise items-center gap-3 text-ash">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-ember" />
          Intelligent ticket operations
        </p>
        <h1 id="hero-title" className="mt-7 max-w-[14ch] font-display text-display-xl">
          <span className="block animate-rise [animation-delay:80ms]">Every ticket,</span>
          <span className="block animate-rise italic text-ember [animation-delay:180ms]">accounted for.</span>
        </h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,34rem)_1fr] lg:items-end">
          <div className="animate-rise [animation-delay:320ms]">
            <p className="max-w-[46ch] text-lg leading-relaxed text-bone/80">
              Tessera reads, routes and tracks every request in flight — then forecasts the week ahead, so your team is staffed
              before the queue arrives.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/app" className="btn btn-light">
                Open the console <ArrowRight className="arrow size-4" />
              </Link>
              <Link to="/app/forecast" className="btn btn-ghost-dark">
                See next week's forecast
              </Link>
            </div>
          </div>

          {/* Floating product fragments */}
          <div className="relative hidden h-56 animate-rise [animation-delay:520ms] lg:block" aria-hidden="true">
            <div className="absolute right-0 bottom-0 w-[22rem] rounded-[18px] border border-white/10 bg-white/[0.06] p-5 shadow-float backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ash">TS-2481 · Billing</span>
                <PriorityMark priority="P2" />
              </div>
              <p className="mt-3 text-[0.95rem] leading-snug">Invoice shows duplicate seat charges for September</p>
              <div className="mt-5 flex items-center justify-between">
                <StageTrackDark stage={HERO_STAGES[stage]} />
                <span key={stage} className="animate-rise font-mono text-[11px] text-bone/80">
                  {STAGES.find((s) => s.id === HERO_STAGES[stage])!.label}
                </span>
              </div>
            </div>
            <div className="absolute right-[19rem] bottom-28 w-56 rounded-[16px] border border-white/10 bg-ink/60 p-4 backdrop-blur-2xl">
              <p className="label text-ash">Next week</p>
              <p className="mt-2 font-display text-4xl leading-none">{nf.format(Math.round(next.total))}</p>
              <p className="mt-1.5 font-mono text-[11px] text-ember-soft">
                ±{nf.format(Math.round((next.hi - next.lo) / 2))} · 80% interval
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StageTrackDark({ stage }: { stage: Stage }) {
  const idx = STAGES.findIndex((s) => s.id === stage)
  return (
    <span className="flex gap-1">
      {STAGES.map((s, i) => (
        <span key={s.id} className={cn('h-1.5 w-7 rounded-full transition-colors duration-700', i < idx ? 'bg-bone' : i === idx ? 'bg-ember' : 'bg-white/15')} />
      ))}
    </span>
  )
}

/* ── Ticker ───────────────────────────────────────────────── */

function Ticker() {
  const items = INITIAL_TICKETS.slice(0, 10).map((t) => `${t.id}  ${t.category} · ${t.priority}  →  ${STAGES.find((s) => s.id === t.stage)!.label}`)
  return (
    <div className="overflow-hidden border-y hairline-dark bg-ink py-4 text-ash" aria-hidden="true">
      <div className="flex w-max animate-marquee gap-14 font-mono text-xs whitespace-nowrap">
        {[...items, ...items].map((s, i) => (
          <span key={i} className="flex items-center gap-14">
            {s}
            <span className="size-1 rounded-full bg-ember" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── 01 Monitor ───────────────────────────────────────────── */

function Monitor() {
  const sample = INITIAL_TICKETS.filter((t) => t.stage !== 'resolved').slice(0, 5)
  const counts = STAGES.map((s) => INITIAL_TICKETS.filter((t) => t.stage === s.id).length)
  const total = counts.reduce((a, b) => a + b, 0)
  return (
    <section id="monitor" className="scroll-mt-20 py-24 sm:py-36" aria-labelledby="monitor-title">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <SectionLabel index="01">Monitor</SectionLabel>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={80}>
            <h2 id="monitor-title" className="font-display text-display-sm text-balance">
              Watch every request move from <em className="text-ember-deep">first word</em> to final reply — and know which ones are
              about to slip.
            </h2>
            <p className="mt-6 max-w-[56ch] text-graphite">
              Each ticket carries its journey with it: five stages, a live SLA clock and the full history of who touched it. Your
              queue stops being a list and becomes a picture.
            </p>
          </Reveal>
        </div>

        {/* Pipeline */}
        <Reveal className="mt-16 sm:mt-24" delay={120}>
          <div className="flex h-3 overflow-hidden rounded-full bg-bone-2" role="img" aria-label={`Pipeline: ${STAGES.map((s, i) => `${counts[i]} ${s.label}`).join(', ')}`}>
            {STAGES.map((s, i) => (
              <span
                key={s.id}
                className={cn('h-full border-r-2 border-bone last:border-0', ['bg-ink', 'bg-ochre', 'bg-ember', 'bg-stone', 'bg-sage'][i])}
                style={{ width: `${(counts[i] / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
            {STAGES.map((s, i) => (
              <div key={s.id}>
                <p className="font-display text-4xl tabular">{counts[i]}</p>
                <p className="mt-1 text-sm text-graphite">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Layered product composition */}
        <div className="relative mt-20 sm:mt-28">
          <div className="absolute -inset-x-5 top-16 bottom-[-3rem] -z-0 rounded-[28px] bg-bone-2 sm:-inset-x-8 lg:left-[18%] lg:-right-12" aria-hidden="true" />
          <Reveal className="relative overflow-hidden rounded-[22px] bg-paper shadow-float lg:mr-[22%]">
            <div className="flex items-center justify-between border-b hairline px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="size-2 animate-pulse-dot rounded-full bg-ember" />
                <p className="text-sm font-medium">Live queue</p>
                <span className="font-mono text-xs text-graphite">{INITIAL_TICKETS.length - counts[4]} open</span>
              </div>
              <Link to="/app" className="text-sm text-graphite link-underline hover:text-ink">
                View all
              </Link>
            </div>
            <ul>
              {sample.map((t) => {
                const sla = slaOf(t, SNAPSHOT)
                return (
                  <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b hairline px-5 py-4 last:border-0 sm:grid-cols-[5.5rem_1fr_9rem_7rem_2rem] sm:px-7">
                    <span className="hidden font-mono text-xs text-graphite sm:block">{t.id}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.9375rem]">{t.title}</span>
                      <span className="mt-0.5 block text-xs text-graphite">
                        {t.requester.org} · {relTime(t.createdAt, SNAPSHOT)}
                      </span>
                    </span>
                    <StageTrack stage={t.stage} className="hidden sm:inline-flex" />
                    <span className={cn('hidden font-mono text-xs sm:block', sla.state === 'breached' ? 'text-ember-deep' : sla.state === 'risk' ? 'text-[#8a5f12]' : 'text-graphite')}>
                      {sla.state === 'breached' ? 'SLA breached' : sla.state === 'risk' ? 'At risk' : 'On track'}
                    </span>
                    <Avatar agentId={t.assigneeId} size="sm" />
                  </li>
                )
              })}
            </ul>
          </Reveal>

          <Reveal delay={240} className="relative mt-6 w-full rounded-[20px] bg-ink p-6 text-bone shadow-float sm:p-7 lg:absolute lg:top-24 lg:right-0 lg:mt-0 lg:w-[26rem]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-ash">{sample[1].id}</span>
              <StagePill stage={sample[1].stage} />
            </div>
            <p className="mt-4 font-display text-[1.7rem] leading-tight">{sample[1].title}</p>
            <ol className="mt-6 space-y-4 border-l hairline-dark pl-5">
              {sample[1].events.slice(-4).map((e, i, arr) => (
                <li key={i} className="relative">
                  <span className={cn('absolute top-1.5 -left-[1.42rem] size-2 rounded-full ring-4 ring-ink', i === arr.length - 1 ? 'bg-ember' : 'bg-ash')} />
                  <p className="text-sm">{e.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ash">
                    {e.by} · {relTime(e.at, SNAPSHOT)}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ── 02 Forecast ──────────────────────────────────────────── */

function Forecast() {
  const bg = useParallax<HTMLDivElement>(0.1)
  const next = forecast.next
  const peakDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][next.peak.day]
  return (
    <section id="forecast" className="grain relative isolate mt-12 scroll-mt-20 overflow-hidden bg-ink py-24 text-bone sm:py-36" aria-labelledby="forecast-title">
      <div ref={bg} className="absolute inset-x-0 -top-24 -bottom-24 -z-10 opacity-60">
        <img src={cdn('/img/terrain.jpg', 1600)} srcSet={srcSet('/img/terrain.jpg', [800, 1200, 1600, 2000])} sizes="100vw" alt="" loading="lazy" width={1376} height={768} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" />
      </div>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <SectionLabel index="02" dark>
              Forecast
            </SectionLabel>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={80}>
            <h2 id="forecast-title" className="font-display text-display">
              See {peakDay} coming <em className="text-ember">on Friday.</em>
            </h2>
            <p className="mt-6 max-w-[56ch] text-bone/75">
              Tessera learns the rhythm of your queue — billing cycles, launches, the Monday surge — and projects the weeks ahead
              with honest uncertainty bands, down to the hour.
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="mt-16 rounded-[24px] border border-white/10 bg-ink-2/70 p-4 backdrop-blur-sm sm:mt-20 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-6 px-2">
            <div>
              <p className="label text-ash">Weekly arrivals · 20 weeks actual, 6 forecast</p>
              <p className="mt-3 font-display text-5xl leading-none">
                {nf.format(Math.round(next.total))} <span className="text-2xl text-ash">next week</span>
              </p>
            </div>
            <div className="flex gap-5 text-xs text-ash">
              <Legend swatch="bg-bone" label="Actual" />
              <Legend swatch="bg-ember" label="Forecast" dashed />
              <Legend swatch="bg-ember/30" label="80% / 95% band" block />
            </div>
          </div>
          <ForecastChart history={forecast.history} points={forecast.points} dark height={340} showFitted={false} />
        </Reveal>

        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {[
            [`${(forecast.accuracy * 100).toFixed(1)}%`, 'Backtest accuracy, last 8 weeks'],
            [`${peakDay.slice(0, 3)} ${String(next.peak.hour).padStart(2, '0')}:00`, 'Predicted busiest hour'],
            [`${next.changePct >= 0 ? '+' : '−'}${Math.abs(next.changePct * 100).toFixed(1)}%`, 'Versus last week'],
            ['6 wks', 'Forward horizon, refreshed nightly'],
          ].map(([v, l], i) => (
            <Reveal key={l} delay={i * 80}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-5xl leading-none tabular">{v}</dd>
              <dd className="mt-3 max-w-[18ch] text-sm text-ash">{l}</dd>
            </Reveal>
          ))}
        </dl>
        <Reveal className="mt-14">
          <Link to="/app/forecast" className="btn btn-light">
            Explore the forecast <ArrowRight className="arrow size-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function Legend({ swatch, label, dashed, block }: { swatch: string; label: string; dashed?: boolean; block?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn(block ? 'h-2.5 w-4 rounded-[2px]' : 'h-[2px] w-5', swatch, dashed && '[mask:repeating-linear-gradient(90deg,#000_0_5px,transparent_5px_9px)]')} />
      {label}
    </span>
  )
}

/* ── 03 Triage ────────────────────────────────────────────── */

const SAMPLE_MESSAGE = `Hi team — since this morning our Okta users get sent back to the sign-in page after they authenticate. About 300 people are blocked and we can't get into production. Please help ASAP.`

function Triage() {
  const [text, setText] = useState(SAMPLE_MESSAGE)
  const guess = useMemo(() => triage(text), [text])
  return (
    <section id="triage" className="scroll-mt-20 py-24 sm:py-36" aria-labelledby="triage-title">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <SectionLabel index="03">Triage</SectionLabel>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={80}>
            <h2 id="triage-title" className="font-display text-display-sm text-balance">
              A message arrives as prose. It leaves as a <em className="text-ember-deep">decision.</em>
            </h2>
            <p className="mt-6 max-w-[56ch] text-graphite">
              Tessera reads intent, urgency and tone, then routes with a confidence score your team can see and overrule. Try it —
              rewrite the message below.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-[1.15fr_auto_1fr] lg:items-stretch">
          <Reveal className="relative rounded-[22px] bg-paper p-6 shadow-lift sm:p-8">
            <div className="flex items-center justify-between">
              <p className="label text-graphite">Incoming · Email</p>
              <span className="font-mono text-xs text-stone">{text.length}/600</span>
            </div>
            <label htmlFor="triage-input" className="sr-only">
              Customer message to classify
            </label>
            <textarea
              id="triage-input"
              value={text}
              maxLength={600}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="mt-5 w-full resize-none bg-transparent font-display text-[1.6rem] leading-snug text-ink outline-none placeholder:text-stone sm:text-[1.85rem]"
              placeholder="Type a customer message…"
            />
            <button onClick={() => setText(SAMPLE_MESSAGE)} className="mt-2 text-xs text-graphite link-underline hover:text-ink">
              Reset sample
            </button>
          </Reveal>

          <div className="flex items-center justify-center py-2 lg:px-2" aria-hidden="true">
            <span className="grid size-12 place-items-center rounded-full bg-ember text-paper shadow-ember max-lg:rotate-90">
              <ArrowRight className="size-5" />
            </span>
          </div>

          <Reveal delay={160} className="rounded-[22px] bg-ink p-6 text-bone shadow-float sm:p-8" aria-live="polite">
            <p className="label flex items-center gap-2 text-ash">
              <Sparkles className="size-3.5 text-ember" /> Classification
            </p>
            {guess ? (
              <dl className="mt-6 divide-y divide-white/10">
                <Row k="Category" v={guess.category} />
                <Row k="Priority" v={<PriorityChip p={guess.priority} />} />
                <Row
                  k="Confidence"
                  v={
                    <span className="flex items-center gap-3">
                      <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-ember transition-[width] duration-700" style={{ width: `${guess.confidence * 100}%` }} />
                      </span>
                      <span className="font-mono text-sm tabular">{Math.round(guess.confidence * 100)}%</span>
                    </span>
                  }
                />
                <Row
                  k="Signals"
                  v={
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {guess.signals.length ? (
                        guess.signals.map((s) => (
                          <span key={s} className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-ash">None strong</span>
                      )}
                    </span>
                  }
                />
              </dl>
            ) : (
              <p className="mt-8 text-sm text-ash">Keep typing — Tessera needs a sentence or so to classify.</p>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <dt className="text-sm text-ash">{k}</dt>
      <dd className="text-right text-[0.95rem]">{v}</dd>
    </div>
  )
}

function PriorityChip({ p }: { p: string }) {
  const tone = p === 'P1' ? 'bg-ember text-paper' : p === 'P2' ? 'bg-ochre text-ink' : 'bg-white/10 text-bone'
  const label = { P1: 'Critical', P2: 'High', P3: 'Normal', P4: 'Low' }[p]
  return <span className={cn('rounded-full px-2.5 py-1 font-mono text-xs', tone)}>{p} · {label}</span>
}

/* ── Principles ───────────────────────────────────────────── */

function Principles() {
  const img = useParallax<HTMLDivElement>(0.08)
  const items = [
    ['Nothing unaccounted for', 'Every request has a stage, an owner and a clock. If a ticket stalls, you see it before your customer feels it.'],
    ['Forecasts you can argue with', 'Every prediction ships with its interval, its backtest and the events that shaped it. Adjust the inputs; watch the numbers move.'],
    ['People make the call', 'AI drafts the routing. Your team confirms, corrects and teaches it — the model earns trust one ticket at a time.'],
  ]
  return (
    <section id="principles" className="scroll-mt-20 border-t hairline bg-paper py-24 sm:py-36" aria-labelledby="principles-title">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-12">
        <div className="lg:col-span-5">
          <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[24px] shadow-float">
            <div ref={img} className="absolute -inset-y-10 inset-x-0">
              <img src={cdn('/img/mosaic.jpg', 900)} srcSet={srcSet('/img/mosaic.jpg', [500, 700, 900, 1200])} sizes="(min-width: 1024px) 40vw, 100vw" alt="Hand-cut stone tesserae in bone, ink and persimmon, scattered on one side and set into an orderly grid on the other." loading="lazy" width={1024} height={1024} className="h-full w-full object-cover" />
            </div>
            <p className="absolute right-5 bottom-5 left-5 rounded-[12px] bg-ink/70 px-4 py-3 text-xs text-bone backdrop-blur-md">
              <span className="font-display text-base italic">tessera</span> (n.) — a small tile of a mosaic; in Rome, a token
              granting admission.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          <Reveal>
            <SectionLabel index="04">Principles</SectionLabel>
          </Reveal>
          <Reveal delay={80}>
            <h2 id="principles-title" className="mt-8 font-display text-display-sm text-balance">
              Order, made from many small pieces.
            </h2>
          </Reveal>
          <ol className="mt-12 border-t hairline">
            {items.map(([h, b], i) => (
              <Reveal as="li" key={h} delay={i * 90} className="group grid grid-cols-[3rem_1fr] gap-4 border-b hairline py-8">
                <span className="font-mono text-xs text-ember-deep">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-[1.9rem] leading-tight transition-transform duration-500 group-hover:translate-x-1.5">{h}</h3>
                  <p className="mt-3 max-w-[48ch] text-graphite">{b}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ── Closing CTA ──────────────────────────────────────────── */

function Closing() {
  return (
    <section className="grain relative isolate overflow-hidden bg-ink py-28 text-bone sm:py-40" aria-labelledby="closing-title">
      <div className="absolute top-1/2 left-1/2 -z-10 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/15 blur-[140px]" aria-hidden="true" />
      <div className="mx-auto max-w-[1400px] px-5 text-center sm:px-8 lg:px-12">
        <Reveal>
          <h2 id="closing-title" className="mx-auto max-w-[16ch] font-display text-display text-balance">
            Your queue, <em className="text-ember">already understood.</em>
          </h2>
        </Reveal>
        <Reveal delay={120} className="mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/app" className="btn btn-ember">
            Open the console <ArrowUpRight className="arrow size-4" />
          </Link>
          <Link to="/app/forecast" className="btn btn-ghost-dark">
            View the forecast
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
