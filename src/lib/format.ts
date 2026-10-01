import type { Ticket } from './fixtures'

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export function relTime(ms: number, from: number) {
  const diff = from - ms
  const abs = Math.abs(diff)
  const m = Math.round(abs / 60_000)
  if (m < 1) return 'just now'
  const unit = m < 60 ? `${m}m` : m < 60 * 24 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${Math.floor(m / 1440)}d`
  return diff >= 0 ? `${unit} ago` : `in ${unit}`
}

export function duration(ms: number) {
  const neg = ms < 0
  const m = Math.round(Math.abs(ms) / 60_000)
  const s = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
  return neg ? `-${s}` : s
}

export function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export type SlaState = 'ok' | 'risk' | 'breached' | 'met'

export function slaOf(t: Ticket, at: number): { state: SlaState; remaining: number; ratio: number } {
  const total = t.slaDueAt - t.createdAt
  if (t.stage === 'resolved') {
    return { state: t.updatedAt <= t.slaDueAt ? 'met' : 'breached', remaining: t.slaDueAt - t.updatedAt, ratio: 1 }
  }
  const remaining = t.slaDueAt - at
  const ratio = Math.min(1, Math.max(0, (at - t.createdAt) / total))
  return { state: remaining < 0 ? 'breached' : ratio > 0.72 ? 'risk' : 'ok', remaining, ratio }
}

export const nf = new Intl.NumberFormat('en-GB')
export const pct = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(digits)}%`
