import { createFileRoute, Link, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, LineChart, Plus, RotateCcw } from 'lucide-react'
import { Wordmark } from '@/components/ui'
import { NewTicketDialog } from '@/components/console/NewTicketDialog'
import { useQueue } from '@/lib/store'
import { cn } from '@/lib/format'

export const Route = createFileRoute('/app')({
  head: () => ({ meta: [{ title: 'Console — Tessera' }] }),
  component: ConsoleLayout,
  errorComponent: ConsoleError,
})

const NAV = [
  { to: '/app', label: 'Live queue', icon: Activity, exact: true },
  { to: '/app/forecast', label: 'Forecast', icon: LineChart, exact: false },
] as const

const NEXT = ['Customers', 'Automations', 'Knowledge base', 'Reports']

function ConsoleLayout() {
  const [creating, setCreating] = useState(false)
  const open = useQueue((s) => s.tickets.filter((t) => t.stage !== 'resolved').length)

  // Global shortcut: "c" to create a ticket
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault()
        setCreating(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh bg-bone lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="grain sticky top-0 hidden h-dvh flex-col bg-ink px-5 pt-7 pb-16 text-bone lg:flex">
        <Link to="/" aria-label="Tessera home" className="px-2">
          <Wordmark dark />
        </Link>
        <button onClick={() => setCreating(true)} className="btn btn-ember mt-9 w-full justify-between">
          <span className="flex items-center gap-2">
            <Plus className="size-4" /> New ticket
          </span>
          <kbd className="rounded bg-white/15 px-1.5 font-mono text-[10px]">C</kbd>
        </button>
        <nav className="mt-8" aria-label="Console">
          <p className="label px-3 text-ash">Operate</p>
          <ul className="mt-3 space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.exact }}
                  className="group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-bone/70 transition-colors hover:bg-white/5 hover:text-bone data-[status=active]:bg-white/[0.08] data-[status=active]:text-bone"
                >
                  <n.icon className="size-4 opacity-70 group-data-[status=active]:text-ember group-data-[status=active]:opacity-100" />
                  {n.label}
                  {n.to === '/app' && <span className="ml-auto font-mono text-[11px] text-ash tabular">{open}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label mt-9 px-3 text-ash">On the roadmap</p>
          <ul className="mt-3 space-y-1" aria-label="Coming soon">
            {NEXT.map((n) => (
              <li key={n} className="flex items-center justify-between px-3 py-2 text-sm text-bone/35">
                {n}
                <span className="font-mono text-[10px] tracking-wider uppercase">Soon</span>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto rounded-[14px] border border-white/10 p-4">
          <p className="flex items-center gap-2 text-xs text-ash">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-ember" /> Model refreshed 06:00 UTC
          </p>
          <p className="mt-2 text-xs leading-relaxed text-bone/60">Forecast retrains nightly on the latest 20 weeks of arrivals.</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b hairline bg-bone/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" aria-label="Tessera home">
            <Wordmark />
          </Link>
          <button onClick={() => setCreating(true)} className="btn btn-ember btn-sm" aria-label="New ticket">
            <Plus className="size-4" /> New
          </button>
        </div>
        <nav className="flex gap-1 px-3 pb-2" aria-label="Console">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-graphite data-[status=active]:bg-ink data-[status=active]:text-bone"
            >
              <n.icon className="size-3.5" /> {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="min-w-0">
        <Outlet />
      </main>

      <NewTicketDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function ConsoleError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div className="grid min-h-dvh place-items-center bg-bone px-6">
      <div className="max-w-md text-center">
        <p className="label text-ember-deep">Console error</p>
        <h1 className="mt-4 font-display text-5xl">The console lost its place.</h1>
        <p className="mt-4 text-graphite">{error instanceof Error ? error.message : 'Something went wrong loading this view.'}</p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            className={cn('btn btn-primary')}
            onClick={() => {
              reset()
              router.invalidate()
            }}
          >
            <RotateCcw className="size-4" /> Retry
          </button>
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  )
}
