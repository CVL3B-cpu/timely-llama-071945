import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutList, Columns3, Search, SlidersHorizontal, X } from 'lucide-react'
import { AGENTS, CATEGORIES, KPI_TRENDS, PRIORITIES, STAGES, type Category, type Priority, type Stage, type Ticket } from '@/lib/fixtures'
import { now, useQueue } from '@/lib/store'
import { cn, duration, relTime, slaOf } from '@/lib/format'
import { Avatar, EmptyState, PriorityMark, SlaMeter, StagePill, StageTrack, stageDot } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import { TicketDrawer } from '@/components/console/TicketDrawer'

interface QueueSearch {
  ticket?: string
}

export const Route = createFileRoute('/app/')({
  head: () => ({ meta: [{ title: 'Live queue — Tessera' }] }),
  validateSearch: (s: Record<string, unknown>): QueueSearch => (typeof s.ticket === 'string' ? { ticket: s.ticket } : {}),
  component: Queue,
})

type Sort = 'urgency' | 'newest' | 'priority'
type View = 'list' | 'board'

const PRIORITY_RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

function Queue() {
  const { ticket: openId } = Route.useSearch()
  const navigate = useNavigate({ from: '/app/' })
  const tickets = useQueue((s) => s.tickets)
  const at = now()

  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [stage, setStageFilter] = useState<Stage | 'all' | 'open'>('open')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [assignee, setAssignee] = useState<string>('all')
  const [riskOnly, setRiskOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('urgency')
  const [view, setView] = useState<View>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // First paint shows the skeleton while the (stubbed) queue "loads"
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const open = tickets.filter((t) => t.stage !== 'resolved')
  const atRisk = open.filter((t) => slaOf(t, at).state !== 'ok')
  const breached = open.filter((t) => slaOf(t, at).state === 'breached')
  const resolved = tickets.filter((t) => t.stage === 'resolved')
  const met = resolved.filter((t) => slaOf(t, at).state === 'met').length
  const ages = open.map((t) => at - t.createdAt).sort((a, b) => a - b)
  const medianAge = ages.length ? ages[Math.floor(ages.length / 2)] : 0
  const counts = STAGES.map((s) => tickets.filter((t) => t.stage === s.id).length)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = tickets.filter((t) => {
      if (stage === 'open' && t.stage === 'resolved') return false
      if (stage !== 'all' && stage !== 'open' && t.stage !== stage) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (category !== 'all' && t.category !== category) return false
      if (assignee !== 'all' && (assignee === 'none' ? t.assigneeId !== null : t.assigneeId !== assignee)) return false
      if (riskOnly && slaOf(t, at).state === 'ok') return false
      if (needle && !`${t.id} ${t.title} ${t.requester.name} ${t.requester.org} ${t.category}`.toLowerCase().includes(needle)) return false
      return true
    })
    return list.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt
      if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.slaDueAt - b.slaDueAt
      const ra = a.stage === 'resolved' ? Infinity : a.slaDueAt
      const rb = b.stage === 'resolved' ? Infinity : b.slaDueAt
      return ra - rb
    })
  }, [tickets, q, stage, priority, category, assignee, riskOnly, sort, at])

  const activeFilters = [priority !== 'all', category !== 'all', assignee !== 'all', riskOnly, q.trim() !== '', stage !== 'open'].filter(Boolean).length
  const clear = () => {
    setQ('')
    setStageFilter('open')
    setPriority('all')
    setCategory('all')
    setAssignee('all')
    setRiskOnly(false)
  }

  const openTicket = (id: string) => navigate({ search: { ticket: id }, replace: false, viewTransition: false })
  const closeTicket = () => navigate({ search: {}, viewTransition: false })

  const dateLabel = new Date(at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-24 sm:px-8 lg:px-12 lg:pt-12">
      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label text-graphite">{dateLabel} · {new Date(at).toISOString().slice(11, 16)} UTC</p>
          <h1 className="mt-3 font-display text-display-sm">Live queue</h1>
        </div>
        <p className="max-w-sm text-sm text-graphite">
          <span className="text-ink">{open.length} open</span>, {atRisk.length} need attention before their SLA clock runs out.
          {breached.length > 0 && <span className="text-ember-deep"> {breached.length} already over.</span>}
        </p>
      </header>

      {/* KPI strip */}
      <section aria-label="Queue health" className="mt-10 grid grid-cols-2 border-y hairline lg:grid-cols-4">
        <Kpi label="Open tickets" value={String(open.length)} note="across 5 stages" trend={KPI_TRENDS.open} />
        <Kpi label="Needs attention" value={String(atRisk.length)} note={`${breached.length} breached`} trend={KPI_TRENDS.risk} tone="ember" />
        <Kpi label="Median age, open" value={duration(medianAge)} note="first response 24m median" trend={KPI_TRENDS.firstResponse} />
        <Kpi label="SLA met" value={resolved.length ? `${Math.round((met / resolved.length) * 100)}%` : '—'} note={`${resolved.length} resolved this cycle`} trend={KPI_TRENDS.slaMet} tone="sage" />
      </section>

      {/* Pipeline */}
      <section aria-label="Pipeline by stage" className="mt-10">
        <div className="flex flex-wrap gap-2">
          <PipeButton active={stage === 'open'} onClick={() => setStageFilter('open')} label="All open" count={open.length} />
          {STAGES.map((s, i) => (
            <PipeButton key={s.id} active={stage === s.id} onClick={() => setStageFilter(s.id)} label={s.label} count={counts[i]} dot={stageDot(s.id)} />
          ))}
          <PipeButton active={stage === 'all'} onClick={() => setStageFilter('all')} label="Everything" count={tickets.length} />
        </div>
      </section>

      {/* Toolbar */}
      <section aria-label="Search and filters" className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone" />
          <label htmlFor="q" className="sr-only">
            Search tickets
          </label>
          <input ref={searchRef} id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID, subject, requester…" className="field pr-10 pl-10" />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-bone-3 px-1.5 font-mono text-[10px] text-stone max-sm:hidden">/</kbd>
        </div>
        <button onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="filters" className={cn('btn btn-sm', filtersOpen ? 'btn-primary' : 'btn-ghost')}>
          <SlidersHorizontal className="size-4" /> Filters
          {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-ember font-mono text-[10px] text-paper">{activeFilters}</span>}
        </button>
        <label className="sr-only" htmlFor="sort">
          Sort
        </label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field h-9 w-auto rounded-full text-sm">
          <option value="urgency">Sort: SLA urgency</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
        </select>
        <div className="flex rounded-full bg-bone-2 p-1" role="group" aria-label="View">
          {(['list', 'board'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn('flex h-7 items-center gap-1.5 rounded-full px-3 text-xs capitalize transition-colors', view === v ? 'bg-paper text-ink shadow-lift' : 'text-graphite hover:text-ink')}>
              {v === 'list' ? <LayoutList className="size-3.5" /> : <Columns3 className="size-3.5" />}
              {v}
            </button>
          ))}
        </div>
      </section>

      <div id="filters" hidden={!filtersOpen} className="mt-4 rounded-[16px] bg-paper p-5 shadow-hair">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
          <Select id="f-priority" label="Priority" value={priority} onChange={(v) => setPriority(v as Priority | 'all')} options={[['all', 'Any priority'], ...PRIORITIES.map((p) => [p.id, `${p.id} · ${p.label}`] as [string, string])]} />
          <Select id="f-category" label="Category" value={category} onChange={(v) => setCategory(v as Category | 'all')} options={[['all', 'Any category'], ...CATEGORIES.map((c) => [c, c] as [string, string])]} />
          <Select id="f-assignee" label="Assignee" value={assignee} onChange={setAssignee} options={[['all', 'Anyone'], ['none', 'Unassigned'], ...AGENTS.map((a) => [a.id, a.name] as [string, string])]} />
          <label className="flex h-11 cursor-pointer items-center gap-3 text-sm">
            <span className={cn('relative h-6 w-10 rounded-full transition-colors', riskOnly ? 'bg-ember' : 'bg-bone-3')}>
              <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} className="peer sr-only" />
              <span className={cn('absolute top-1 left-1 size-4 rounded-full bg-paper shadow-lift transition-transform duration-300', riskOnly && 'translate-x-4')} />
              <span className="absolute -inset-1 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-ember" />
            </span>
            At risk only
          </label>
          <button onClick={clear} className="btn btn-ghost btn-sm" disabled={activeFilters === 0}>
            <X className="size-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Results */}
      <section aria-label="Tickets" aria-busy={!ready} className="mt-6">
        <p className="mb-3 text-xs text-graphite" aria-live="polite">
          {ready ? `${filtered.length} ${filtered.length === 1 ? 'ticket' : 'tickets'}` : 'Loading queue…'}
        </p>
        {!ready ? (
          <QueueSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] bg-paper shadow-hair">
            <EmptyState
              title={tickets.length === 0 ? 'The queue is clear.' : 'Nothing matches.'}
              body={tickets.length === 0 ? 'New requests appear here the moment they arrive.' : 'No tickets fit these filters. Loosen them, or search for something else.'}
              action={
                activeFilters > 0 && (
                  <button onClick={clear} className="btn btn-primary btn-sm">
                    Clear all filters
                  </button>
                )
              }
            />
          </div>
        ) : view === 'list' ? (
          <TicketList tickets={filtered} at={at} onOpen={openTicket} />
        ) : (
          <Board tickets={filtered} at={at} onOpen={openTicket} />
        )}
      </section>

      <TicketDrawer id={openId ?? null} onClose={closeTicket} />
    </div>
  )
}

/* ── Pieces ───────────────────────────────────────────────── */

function Kpi({ label, value, note, trend, tone }: { label: string; value: string; note: string; trend: number[]; tone?: 'ember' | 'sage' }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-r hairline px-4 py-6 last:border-r-0 max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-graphite">{label}</p>
        <Sparkline values={trend} stroke={tone === 'ember' ? 'var(--color-ember)' : tone === 'sage' ? 'var(--color-sage)' : 'var(--color-ink)'} className="max-sm:hidden" />
      </div>
      <div>
        <p className={cn('font-display text-5xl leading-none tabular', tone === 'ember' && 'text-ember-deep')}>{value}</p>
        <p className="mt-2 text-xs text-graphite">{note}</p>
      </div>
    </div>
  )
}

function PipeButton({ active, onClick, label, count, dot }: { active: boolean; onClick: () => void; label: string; count: number; dot?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-9 items-center gap-2 rounded-full px-3.5 text-sm transition-all duration-300',
        active ? 'bg-ink text-bone shadow-lift' : 'bg-paper text-graphite shadow-hair hover:text-ink hover:shadow-[0_0_0_1px_rgb(21_18_15/0.25)]',
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {label}
      <span className={cn('font-mono text-[11px] tabular', active ? 'text-ash' : 'text-stone')}>{count}</span>
    </button>
  )
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-graphite">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  )
}

function TicketList({ tickets, at, onOpen }: { tickets: Ticket[]; at: number; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-paper shadow-hair">
      <div className="hidden grid-cols-[6rem_minmax(0,1fr)_7.5rem_6.5rem_7rem_2.5rem] gap-5 border-b hairline px-6 py-3 lg:grid" aria-hidden="true">
        {['Ticket', 'Subject', 'Progress', 'Priority', 'SLA', ''].map((h) => (
          <span key={h} className="label text-stone">
            {h}
          </span>
        ))}
      </div>
      <ul>
        {tickets.map((t, i) => {
          const sla = slaOf(t, at)
          return (
            <li key={t.id} className="border-b hairline last:border-0" style={{ animation: `rise .6s var(--ease-out-expo) ${Math.min(i, 12) * 30}ms both` }}>
              <button
                onClick={() => onOpen(t.id)}
                className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-bone/60 sm:px-6 lg:grid-cols-[6rem_minmax(0,1fr)_7.5rem_6.5rem_7rem_2.5rem] lg:gap-5"
              >
                <span className="font-mono text-xs text-graphite max-lg:hidden">{t.id}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    {sla.state === 'breached' && <span className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-ember" aria-label="SLA breached" />}
                    <span className="truncate text-[0.95rem] transition-transform duration-300 group-hover:translate-x-0.5">{t.title}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-graphite">
                    <span className="font-mono lg:hidden">{t.id} · </span>
                    {t.requester.org} · {t.category} · {relTime(t.createdAt, at)}
                  </span>
                </span>
                <span className="max-lg:hidden">
                  <StageTrack stage={t.stage} />
                </span>
                <span className="max-lg:hidden">
                  <PriorityMark priority={t.priority} showLabel />
                </span>
                <span className="max-lg:hidden">
                  <SlaMeter {...sla} compact />
                </span>
                <span className="flex items-center gap-3 lg:justify-end">
                  <span className="lg:hidden">
                    <PriorityMark priority={t.priority} />
                  </span>
                  <Avatar agentId={t.assigneeId} size="sm" />
                </span>
                <span className="col-span-2 flex items-center justify-between gap-4 lg:hidden">
                  <StagePill stage={t.stage} />
                  <SlaMeter {...sla} compact />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Board({ tickets, at, onOpen }: { tickets: Ticket[]; at: number; onOpen: (id: string) => void }) {
  return (
    <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
      <div className="grid min-w-[1080px] grid-cols-5 gap-4">
        {STAGES.map((s) => {
          const col = tickets.filter((t) => t.stage === s.id)
          return (
            <section key={s.id} aria-label={s.label} className="rounded-[18px] bg-bone-2/70 p-2.5">
              <header className="flex items-center justify-between px-2 pt-1.5 pb-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn('size-1.5 rounded-full', stageDot(s.id))} />
                  {s.label}
                </p>
                <span className="font-mono text-[11px] text-graphite">{col.length}</span>
              </header>
              <ul className="space-y-2">
                {col.map((t) => {
                  const sla = slaOf(t, at)
                  return (
                    <li key={t.id}>
                      <button onClick={() => onOpen(t.id)} className="w-full rounded-[12px] bg-paper p-3.5 text-left shadow-hair transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                        <span className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-graphite">{t.id}</span>
                          <PriorityMark priority={t.priority} />
                        </span>
                        <span className="mt-2 line-clamp-2 block text-sm leading-snug">{t.title}</span>
                        <span className="mt-3 flex items-end justify-between gap-2">
                          <SlaMeter {...sla} compact />
                          <Avatar agentId={t.assigneeId} size="sm" />
                        </span>
                      </button>
                    </li>
                  )
                })}
                {col.length === 0 && <li className="rounded-[12px] border border-dashed border-bone-3 px-3 py-6 text-center text-xs text-stone">No tickets</li>}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] bg-paper shadow-hair" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-5 border-b hairline px-6 py-5 last:border-0">
          <span className="skeleton h-3 w-16 max-lg:hidden" />
          <span className="flex-1 space-y-2">
            <span className="skeleton block h-3.5" style={{ width: `${70 - (i % 3) * 12}%` }} />
            <span className="skeleton block h-2.5 w-1/3" />
          </span>
          <span className="skeleton h-2 w-24 max-lg:hidden" />
          <span className="skeleton size-6 rounded-full" />
        </div>
      ))}
    </div>
  )
}
