import type { Category, Priority } from './fixtures'

/**
 * Lightweight on-device triage preview used by the "New ticket" form.
 * A later milestone replaces this with a model call through Netlify AI
 * Gateway; the return shape is the contract.
 */
const RULES: Array<{ category: Category; words: string[] }> = [
  { category: 'Billing', words: ['invoice', 'refund', 'charge', 'billing', 'payment', 'card', 'vat', 'tax', 'renewal', 'credit', 'plan'] },
  { category: 'Access & Auth', words: ['login', 'log in', 'sso', 'password', 'mfa', '2fa', 'sign in', 'okta', 'invite', 'locked', 'session', 'access'] },
  { category: 'Integrations', words: ['api', 'webhook', 'sync', 'slack', 'salesforce', 'integration', 'export', 'import', 'rate limit', 'zapier'] },
  { category: 'Outage', words: ['down', 'outage', '502', '500', 'error', 'timeout', 'times out', 'not loading', 'unavailable', 'degraded'] },
  { category: 'Onboarding', words: ['onboard', 'setup', 'set up', 'training', 'migrate', 'how do', 'getting started', 'demo'] },
  { category: 'Hardware', words: ['printer', 'laptop', 'kiosk', 'device', 'monitor', 'dock', 'tablet', 'hardware', 'firmware'] },
]

const URGENT = ['urgent', 'asap', 'blocked', 'everyone', 'all users', 'production', 'down', 'outage', 'cannot', "can't", 'critical']
const ELEVATED = ['still', 'again', 'frustrat', 'multiple', 'several', 'customers']

export interface TriageGuess {
  category: Category
  priority: Priority
  confidence: number
  signals: string[]
}

export function triage(text: string): TriageGuess | null {
  const s = text.toLowerCase()
  if (s.trim().length < 12) return null
  let best: { category: Category; hits: string[] } | null = null
  for (const r of RULES) {
    const hits = r.words.filter((w) => s.includes(w))
    if (!best || hits.length > best.hits.length) best = { category: r.category, hits }
  }
  const urgent = URGENT.filter((w) => s.includes(w))
  const elevated = ELEVATED.filter((w) => s.includes(w))
  const priority: Priority = urgent.length >= 2 || best?.category === 'Outage' ? 'P1' : urgent.length ? 'P2' : elevated.length ? 'P3' : 'P4'
  const hits = best?.hits ?? []
  const confidence = Math.min(0.97, 0.52 + hits.length * 0.13 + Math.min(s.length, 400) / 4000)
  return {
    category: hits.length ? best!.category : 'Onboarding',
    priority,
    confidence: Math.round(confidence * 100) / 100,
    signals: [...hits, ...urgent].slice(0, 4),
  }
}
