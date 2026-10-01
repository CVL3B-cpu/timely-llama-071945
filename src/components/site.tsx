import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Wordmark } from './ui'
import { cn } from '@/lib/format'

const NAV = [
  { href: '#monitor', label: 'Monitor' },
  { href: '#forecast', label: 'Forecast' },
  { href: '#triage', label: 'Triage' },
  { href: '#principles', label: 'Principles' },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const solid = scrolled && !open
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500',
        solid ? 'bg-bone/80 text-ink shadow-[0_1px_0_rgb(21_18_15/0.08)] backdrop-blur-xl' : 'text-bone',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-12" aria-label="Main">
        <Link to="/" aria-label="Tessera home" className="relative z-10">
          <Wordmark dark={!solid} />
        </Link>
        <ul className="hidden items-center gap-9 text-sm md:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} className="link-underline pb-0.5 opacity-80 transition-opacity hover:opacity-100">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link to="/app" className={cn('btn btn-sm hidden sm:inline-flex', solid ? 'btn-primary' : 'btn-light')}>
            Open console <ArrowUpRight className="arrow size-4" />
          </Link>
          <button
            className="relative z-10 grid size-10 place-items-center rounded-full md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 bg-ink text-bone transition-[opacity,visibility] duration-500 md:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <div className="flex h-full flex-col px-6 pt-28 pb-16">
          <ul className="space-y-2">
            {NAV.map((n, i) => (
              <li key={n.href} className={cn('transition-all duration-700', open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')} style={{ transitionDelay: open ? `${80 + i * 50}ms` : '0ms' }}>
                <a href={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-2 font-display text-5xl">
                  <span className="label text-ember">0{i + 1}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <Link to="/app" className="btn btn-ember mt-auto w-full">
            Open the console
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-ink pb-16 text-bone sm:pb-10">
      <div className="mx-auto grid max-w-[1400px] gap-12 border-t hairline-dark px-5 pt-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-12">
        <div>
          <Wordmark dark />
          <p className="mt-5 max-w-xs text-sm text-ash">Intelligent ticket operations. Every request accounted for, every week anticipated.</p>
        </div>
        {[
          { h: 'Product', l: [['Live queue', '/app'], ['Forecast', '/app/forecast']] },
          { h: 'Platform', l: [['Triage model', '#triage'], ['Method', '#principles']] },
          { h: 'Studio', l: [['Designed by Caleb Krewu', '#top']] },
        ].map((c) => (
          <div key={c.h}>
            <p className="label text-ash">{c.h}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.l.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith('/') ? (
                    <Link to={href as '/app'} className="link-underline text-bone/85 hover:text-bone">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="link-underline text-bone/85 hover:text-bone">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-[1400px] flex-wrap justify-between gap-4 px-5 text-xs text-ash sm:px-8 lg:px-12">
        <span className="pl-28 sm:pl-32">© 2026 Tessera Systems</span>
        <span className="font-mono">Status · All systems nominal</span>
      </div>
    </footer>
  )
}

/** Gentle scroll-linked translate. Disabled for reduced-motion users. */
export function useParallax<T extends HTMLElement>(speed = 0.15) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const tick = () => {
      raf = 0
      const r = el.parentElement!.getBoundingClientRect()
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [speed])
  return ref
}
