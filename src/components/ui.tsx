import { useEffect, useRef, type CSSProperties, type ReactNode, type ElementType } from 'react'
import { useStore } from '@tanstack/react-store'
import { X, Check, AlertTriangle } from 'lucide-react'
import { AGENTS, STAGES, type Priority, type Stage } from '@/lib/fixtures'
import { cn, duration, type SlaState } from '@/lib/format'
import { dismissToast, toastStore } from '@/lib/store'

/* ── Brand ────────────────────────────────────────────────── */

/** The mark: a single tessera, tilted, with a perforation notch. */
export function Mark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g transform="rotate(-12 16 16)">
        <rect x="7" y="5" width="18" height="22" rx="3.5" fill="currentColor" />
        <circle cx="7" cy="16" r="2.6" fill="var(--mark-cut, var(--color-bone))" />
        <circle cx="25" cy="16" r="2.6" fill="var(--mark-cut, var(--color-bone))" />
        <path d="M11 16h10" stroke="var(--mark-cut, var(--color-bone))" strokeWidth="1.2" strokeDasharray="1.6 1.8" />
        <rect x="11" y="9" width="6" height="2.4" rx="1.2" fill="var(--color-ember)" />
      </g>
    </svg>
  )
}

export function Wordmark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      className={cn('inline-flex items-center gap-2', dark ? 'text-bone' : 'text-ink', className)}
      style={{ '--mark-cut': dark ? 'var(--color-ink)' : 'var(--color-bone)' } as CSSProperties}
    >
      <Mark className="size-7" />
      <span className="font-display text-[1.65rem] leading-none tracking-tight">Tessera</span>
    </span>
  )
}

/** Signature watermark, fixed to the bottom-left corner of every page. */
export function Watermark() {
  return (
    <div
      aria-label="Designed by Caleb Krewu"
      className="pointer-events-none fixed bottom-3 left-4 z-[60] select-none text-bone mix-blend-difference sm:bottom-4 sm:left-5"
    >
      <span className="flex items-center gap-2 opacity-70">
        <span className="h-px w-5 bg-current" />
        <span className="font-display text-[0.95rem] italic leading-none tracking-wide">Caleb Krewu</span>
      </span>
    </div>
  )
}

/* ── Motion ───────────────────────────────────────────────── */

export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
  ...rest
}: { as?: ElementType; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = 'true'
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} data-reveal="" className={className} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  )
}

/* ── Ticket primitives ────────────────────────────────────── */

const STAGE_TONE: Record<Stage, string> = {
  new: 'bg-paper text-ink shadow-[inset_0_0_0_1px_rgb(21_18_15/0.18)]',
  triage: 'bg-ochre-soft text-[#6d4a0e]',
  in_progress: 'bg-ember-wash text-ember-deep',
  waiting: 'bg-bone-2 text-graphite',
  resolved: 'bg-sage-soft text-[#2f4a33]',
}
const STAGE_DOT: Record<Stage, string> = {
  new: 'bg-ink',
  triage: 'bg-ochre',
  in_progress: 'bg-ember',
  waiting: 'bg-stone',
  resolved: 'bg-sage',
}

export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  const s = STAGES.find((x) => x.id === stage)!
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium', STAGE_TONE[stage], className)}>
      <span className={cn('size-1.5 rounded-full', STAGE_DOT[stage])} />
      {s.label}
    </span>
  )
}

export function stageDot(stage: Stage) {
  return STAGE_DOT[stage]
}

/** Five notches, one per stage — the ticket's journey at a glance. */
export function StageTrack({ stage, className }: { stage: Stage; className?: string }) {
  const idx = STAGES.findIndex((s) => s.id === stage)
  return (
    <span className={cn('inline-flex items-center gap-[3px]', className)} role="img" aria-label={`Stage ${idx + 1} of 5: ${STAGES[idx].label}`}>
      {STAGES.map((s, i) => (
        <span
          key={s.id}
          className={cn(
            'h-1.5 w-4 rounded-[2px] transition-colors duration-500',
            i < idx ? 'bg-ink' : i === idx ? (stage === 'resolved' ? 'bg-sage' : 'bg-ember') : 'bg-bone-3',
          )}
        />
      ))}
    </span>
  )
}

const PRIORITY_STYLE: Record<Priority, { bars: number; color: string; label: string }> = {
  P1: { bars: 4, color: 'bg-ember', label: 'Critical' },
  P2: { bars: 3, color: 'bg-ochre', label: 'High' },
  P3: { bars: 2, color: 'bg-graphite', label: 'Normal' },
  P4: { bars: 1, color: 'bg-stone', label: 'Low' },
}

export function PriorityMark({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const p = PRIORITY_STYLE[priority]
  return (
    <span className="inline-flex items-center gap-2" title={`${priority} · ${p.label}`}>
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={cn('w-[3px] rounded-[1px]', b <= p.bars ? p.color : 'bg-bone-3')} style={{ height: `${25 + b * 18.75}%` }} />
        ))}
      </span>
      <span className={cn('font-mono text-xs', showLabel ? '' : 'sr-only')}>
        {priority}
        {showLabel && <span className="text-graphite"> · {p.label}</span>}
      </span>
    </span>
  )
}

const SLA_COLOR: Record<SlaState, string> = {
  ok: 'bg-ink',
  risk: 'bg-ochre',
  breached: 'bg-ember',
  met: 'bg-sage',
}
const SLA_TEXT: Record<SlaState, string> = {
  ok: 'text-ink',
  risk: 'text-[#8a5f12]',
  breached: 'text-ember-deep',
  met: 'text-[#3c5b40]',
}

export function SlaMeter({ state, remaining, ratio, compact = false }: { state: SlaState; remaining: number; ratio: number; compact?: boolean }) {
  const text = state === 'met' ? 'Met' : state === 'breached' ? `${duration(-remaining)} over` : `${duration(remaining)} left`
  return (
    <span className={cn('inline-flex flex-col gap-1', compact ? 'w-24' : 'w-full')}>
      <span className={cn('font-mono text-xs tabular', SLA_TEXT[state])}>{text}</span>
      <span className="relative h-[3px] overflow-hidden rounded-full bg-bone-3">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', SLA_COLOR[state])}
          style={{ width: `${Math.max(4, ratio * 100)}%` }}
        />
      </span>
    </span>
  )
}

export function Avatar({ agentId, size = 'md' }: { agentId: string | null; size?: 'sm' | 'md' }) {
  const a = AGENTS.find((x) => x.id === agentId)
  const dim = size === 'sm' ? 'size-6 text-[0.6rem]' : 'size-8 text-[0.68rem]'
  if (!a)
    return (
      <span className={cn('inline-grid place-items-center rounded-full border border-dashed border-stone text-stone', dim)} title="Unassigned">
        <span aria-hidden="true">–</span>
        <span className="sr-only">Unassigned</span>
      </span>
    )
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-mono font-medium text-paper ring-2 ring-paper', dim)}
      style={{ background: a.hue }}
      title={a.name}
    >
      {a.initials}
    </span>
  )
}

/* ── Feedback ─────────────────────────────────────────────── */

export function Toaster() {
  const toasts = useStore(toastStore, (s) => s)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex animate-rise items-start gap-3 rounded-[14px] bg-ink p-4 text-bone shadow-float"
        >
          <span
            className={cn(
              'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
              t.tone === 'error' ? 'bg-ember' : t.tone === 'success' ? 'bg-sage' : 'bg-ink-4',
            )}
          >
            {t.tone === 'error' ? <AlertTriangle className="size-3" /> : <Check className="size-3" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.body && <p className="mt-0.5 text-[0.8125rem] text-ash">{t.body}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="-m-1 rounded-full p-1 text-ash hover:text-bone" aria-label="Dismiss notification">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="relative mb-6 h-16 w-24" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute top-2 left-1/2 h-12 w-9 rounded-md border border-bone-3 bg-paper shadow-lift"
            style={{ transform: `translateX(-50%) translateX(${(i - 1) * 22}px) rotate(${(i - 1) * 9}deg)`, zIndex: i === 1 ? 2 : 1 }}
          >
            {i === 1 && <span className="absolute top-2 left-2 h-1 w-3 rounded-full bg-ember" />}
          </span>
        ))}
      </div>
      <h3 className="font-display text-3xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-graphite">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function SectionLabel({ index, children, dark = false }: { index?: string; children: ReactNode; dark?: boolean }) {
  return (
    <p className={cn('label flex items-center gap-3', dark ? 'text-ash' : 'text-graphite')}>
      {index && <span className="text-ember">{index}</span>}
      <span className={cn('h-px w-8', dark ? 'bg-ash/40' : 'bg-graphite/40')} />
      {children}
    </p>
  )
}
