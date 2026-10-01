/**
 * Stubbed data for milestone 1.
 *
 * Everything the UI reads lives in this one module so a later milestone can
 * swap it for Netlify Database queries without touching components. Values are
 * generated from a seeded PRNG against a fixed snapshot time so server and
 * client renders are identical (no hydration drift).
 */

export const SNAPSHOT = new Date('2026-10-01T09:41:00Z').getTime()

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export type Stage = 'new' | 'triage' | 'in_progress' | 'waiting' | 'resolved'
export type Priority = 'P1' | 'P2' | 'P3' | 'P4'
export type Channel = 'Email' | 'Chat' | 'Portal' | 'Phone' | 'API'
export type Category =
  | 'Billing'
  | 'Access & Auth'
  | 'Integrations'
  | 'Outage'
  | 'Onboarding'
  | 'Hardware'

export const STAGES: { id: Stage; label: string; short: string }[] = [
  { id: 'new', label: 'New', short: 'New' },
  { id: 'triage', label: 'Triaged', short: 'Triage' },
  { id: 'in_progress', label: 'In progress', short: 'Active' },
  { id: 'waiting', label: 'Waiting on customer', short: 'Waiting' },
  { id: 'resolved', label: 'Resolved', short: 'Done' },
]

export const PRIORITIES: { id: Priority; label: string; slaHours: number }[] = [
  { id: 'P1', label: 'Critical', slaHours: 4 },
  { id: 'P2', label: 'High', slaHours: 12 },
  { id: 'P3', label: 'Normal', slaHours: 36 },
  { id: 'P4', label: 'Low', slaHours: 72 },
]

export const CATEGORIES: Category[] = [
  'Billing',
  'Access & Auth',
  'Integrations',
  'Outage',
  'Onboarding',
  'Hardware',
]

export const CHANNELS: Channel[] = ['Email', 'Chat', 'Portal', 'Phone', 'API']

export interface Agent {
  id: string
  name: string
  initials: string
  role: string
  hue: string
}

export const AGENTS: Agent[] = [
  { id: 'ama', name: 'Ama Owusu', initials: 'AO', role: 'Tier 2 · Billing', hue: '#e2552b' },
  { id: 'jonas', name: 'Jonas Lindqvist', initials: 'JL', role: 'Tier 3 · Platform', hue: '#56755a' },
  { id: 'priya', name: 'Priya Raman', initials: 'PR', role: 'Tier 2 · Integrations', hue: '#c48a26' },
  { id: 'theo', name: 'Théo Marchand', initials: 'TM', role: 'Tier 1 · Generalist', hue: '#5b544c' },
  { id: 'kofi', name: 'Kofi Mensah', initials: 'KM', role: 'Tier 3 · Incidents', hue: '#2b2621' },
]

export interface TicketEvent {
  at: number
  label: string
  by: string
  kind: 'created' | 'ai' | 'stage' | 'note' | 'assign'
}

export interface Ticket {
  id: string
  title: string
  description: string
  requester: { name: string; email: string; org: string }
  channel: Channel
  category: Category
  priority: Priority
  stage: Stage
  assigneeId: string | null
  createdAt: number
  updatedAt: number
  slaDueAt: number
  ai: { confidence: number; sentiment: 'calm' | 'frustrated' | 'urgent'; summary: string }
  events: TicketEvent[]
}

/* ── Seeded PRNG (mulberry32) ─────────────────────────────── */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEEDS: Array<{
  title: string
  description: string
  category: Category
  requester: [string, string]
  sentiment: Ticket['ai']['sentiment']
}> = [
  { title: 'Invoice shows duplicate seat charges for September', description: 'Our September invoice lists 42 seats twice. We only added three people this month. Finance needs a corrected invoice before the quarter closes.', category: 'Billing', requester: ['Hannah Weiss', 'Northwind Freight'], sentiment: 'frustrated' },
  { title: 'SSO login loops back to sign-in page', description: 'Since this morning our Okta users get redirected back to the sign-in page after authenticating. Around 300 people are blocked.', category: 'Access & Auth', requester: ['Marcus Bell', 'Halcyon Health'], sentiment: 'urgent' },
  { title: 'Webhook deliveries delayed by 20+ minutes', description: 'Order webhooks to our fulfilment endpoint are arriving 20 to 40 minutes late. Nothing changed on our side.', category: 'Integrations', requester: ['Sofia Alvarez', 'Lumen Retail'], sentiment: 'frustrated' },
  { title: 'Dashboard returns 502 for EU workspace', description: 'All users on the EU workspace see a 502 when loading the dashboard. Status page shows green.', category: 'Outage', requester: ['Lukas Brandt', 'Kessel Group'], sentiment: 'urgent' },
  { title: 'Need help importing historical tickets from Zendesk', description: 'We are migrating and want to bring two years of history across. What is the recommended path and timeline?', category: 'Onboarding', requester: ['Aiko Tanaka', 'Mori & Partners'], sentiment: 'calm' },
  { title: 'Badge printers offline at the Lisbon office', description: 'Both reception badge printers show offline after the firmware update last night.', category: 'Hardware', requester: ['Rui Costa', 'Atlântico Labs'], sentiment: 'frustrated' },
  { title: 'Request to change billing contact', description: 'Please move billing emails from our former controller to finance@ address going forward.', category: 'Billing', requester: ['Grace Kim', 'Orchard Studio'], sentiment: 'calm' },
  { title: 'API rate limit hit despite enterprise plan', description: 'We receive 429 responses at roughly 600 requests per minute but our contract says 3,000.', category: 'Integrations', requester: ['Daniel Osei', 'Ridgeline Data'], sentiment: 'frustrated' },
  { title: 'New hires not receiving invite emails', description: 'Invites sent to five new hires have not arrived. Checked spam folders already.', category: 'Access & Auth', requester: ['Elena Petrova', 'Brightwater'], sentiment: 'calm' },
  { title: 'Slack integration posts to the wrong channel', description: 'Escalation alerts are landing in #general instead of #support-escalations since we renamed channels.', category: 'Integrations', requester: ['Oliver Grant', 'Fieldnote'], sentiment: 'calm' },
  { title: 'Kiosk tablets stuck on boot screen', description: 'Six of our check-in kiosks are frozen on the boot logo. Power cycling did not help.', category: 'Hardware', requester: ['Nadia Haddad', 'Cedar Clinics'], sentiment: 'urgent' },
  { title: 'Workspace setup call for regional team', description: 'Our APAC team is onboarding next week. Can we book a 45 minute setup call?', category: 'Onboarding', requester: ['Wei Zhang', 'Pacific Arc'], sentiment: 'calm' },
  { title: 'Refund for annual plan downgrade', description: 'We downgraded from Business to Team mid-cycle and expected a prorated credit that has not appeared.', category: 'Billing', requester: ['Sam Whitaker', 'Copperline'], sentiment: 'frustrated' },
  { title: 'MFA codes rejected for some users', description: 'A handful of users report TOTP codes being rejected even though their device time is correct.', category: 'Access & Auth', requester: ['Isabel Duarte', 'Verde Mobility'], sentiment: 'frustrated' },
  { title: 'Search results missing recent records', description: 'Records created in the last two hours do not appear in search. Older records are fine.', category: 'Outage', requester: ['Henrik Olsen', 'Fjord Systems'], sentiment: 'frustrated' },
  { title: 'Salesforce sync mapping for custom fields', description: 'How do we map our custom “Region” picklist to the ticket region field during sync?', category: 'Integrations', requester: ['Chloé Martin', 'Maison Verre'], sentiment: 'calm' },
  { title: 'Tax ID missing from invoices', description: 'Our VAT number needs to appear on every invoice for compliance. It was there until July.', category: 'Billing', requester: ['Matteo Ricci', 'Studio Tevere'], sentiment: 'calm' },
  { title: 'Laptop provisioning failed for 3 devices', description: 'Autopilot enrolment fails at the account setup step on three new laptops.', category: 'Hardware', requester: ['Zara Ahmed', 'Meridian Law'], sentiment: 'calm' },
  { title: 'Agents logged out every 15 minutes', description: 'Support agents are being signed out roughly every 15 minutes since yesterday afternoon.', category: 'Access & Auth', requester: ['Tom Becker', 'Alpenglow'], sentiment: 'urgent' },
  { title: 'Training resources for supervisors', description: 'Do you have a curriculum or recorded sessions for team supervisors new to the reporting suite?', category: 'Onboarding', requester: ['Leila Nasser', 'Oasis Group'], sentiment: 'calm' },
  { title: 'Payments page times out at checkout', description: 'Customers report the payments page spinning and timing out at the final step. Started 40 minutes ago.', category: 'Outage', requester: ['Jack Morrison', 'Harbor & Pine'], sentiment: 'urgent' },
  { title: 'Export to CSV drops non-Latin characters', description: 'Exports replace Japanese and Arabic characters with question marks.', category: 'Integrations', requester: ['Yuki Sato', 'Kumo Travel'], sentiment: 'calm' },
  { title: 'Card declined on renewal', description: 'Our renewal charge was declined but the card is valid. Please retry or send a payment link.', category: 'Billing', requester: ['Ava Thompson', 'Tallgrass Co.'], sentiment: 'calm' },
  { title: 'Docking stations not detecting monitors', description: 'After the driver push, docking stations on floor 4 no longer detect external monitors.', category: 'Hardware', requester: ['Ben Carter', 'Northgate'], sentiment: 'frustrated' },
]

const STAGE_MIX: Stage[] = [
  'new', 'triage', 'in_progress', 'in_progress', 'waiting', 'triage', 'in_progress', 'resolved',
  'new', 'in_progress', 'triage', 'waiting', 'resolved', 'in_progress', 'new', 'resolved',
  'in_progress', 'triage', 'waiting', 'resolved', 'new', 'in_progress', 'resolved', 'triage',
]

function priorityFor(sentiment: Ticket['ai']['sentiment'], cat: Category, r: number): Priority {
  if (cat === 'Outage' || sentiment === 'urgent') return r > 0.25 ? 'P1' : 'P2'
  if (sentiment === 'frustrated') return r > 0.5 ? 'P2' : 'P3'
  return r > 0.7 ? 'P3' : 'P4'
}

const SUMMARY: Record<Category, string> = {
  Billing: 'Billing discrepancy; likely needs an invoice correction or credit memo from Finance Ops.',
  'Access & Auth': 'Authentication issue with identity provider; check recent IdP config and session policy.',
  Integrations: 'Third-party integration behaving unexpectedly; inspect delivery logs and mapping config.',
  Outage: 'Probable service degradation; correlate with incident timeline before replying.',
  Onboarding: 'Enablement request; route to Customer Success with suggested resources.',
  Hardware: 'On-site device fault after recent update; candidate for rollback or field dispatch.',
}

function buildTickets(): Ticket[] {
  const r = rng(2481)
  return SEEDS.map((s, i) => {
    const stage = STAGE_MIX[i % STAGE_MIX.length]
    const priority = priorityFor(s.sentiment, s.category, r())
    const sla = PRIORITIES.find((p) => p.id === priority)!.slaHours
    const ageMin = Math.round(15 + r() * (stage === 'new' ? 90 : stage === 'resolved' ? 2400 : 1600))
    const createdAt = SNAPSHOT - ageMin * MIN
    const [name, org] = s.requester
    const email = `${name.split(' ')[0].toLowerCase()}@${org.toLowerCase().replace(/[^a-z]+/g, '')}.com`
    const assignee = stage === 'new' ? null : AGENTS[Math.floor(r() * AGENTS.length)].id
    const agentName = AGENTS.find((a) => a.id === assignee)?.name ?? 'Unassigned'
    const confidence = Math.round((0.78 + r() * 0.21) * 100) / 100

    const events: TicketEvent[] = [
      { at: createdAt, kind: 'created', label: `Received via ${CHANNELS[i % CHANNELS.length]}`, by: name },
      { at: createdAt + 8_000, kind: 'ai', label: `Classified as ${s.category} · ${priority} · ${Math.round(confidence * 100)}% confidence`, by: 'Tessera AI' },
    ]
    const order = STAGES.map((x) => x.id)
    const reached = order.indexOf(stage)
    let t = createdAt + 8_000
    for (let k = 1; k <= reached; k++) {
      t += Math.round((ageMin * MIN * (0.15 + r() * 0.2)) / Math.max(reached, 1))
      if (k === 1 && assignee) events.push({ at: t - 30_000, kind: 'assign', label: `Assigned to ${agentName}`, by: 'Routing' })
      events.push({ at: Math.min(t, SNAPSHOT - MIN), kind: 'stage', label: `Moved to ${STAGES[k].label}`, by: agentName })
    }

    return {
      id: `TS-${2481 - i * 7}`,
      title: s.title,
      description: s.description,
      requester: { name, email, org },
      channel: CHANNELS[i % CHANNELS.length],
      category: s.category,
      priority,
      stage,
      assigneeId: assignee,
      createdAt,
      updatedAt: events[events.length - 1].at,
      slaDueAt: createdAt + sla * HOUR,
      ai: { confidence, sentiment: s.sentiment, summary: SUMMARY[s.category] },
      events,
    }
  })
}

export const INITIAL_TICKETS: Ticket[] = buildTickets()

/* ── Weekly arrivals history (for forecasting) ────────────── */

export interface WeekPoint {
  /** ISO date of the Monday that starts the week */
  weekStart: string
  total: number
  byCategory: Record<Category, number>
}

const CATEGORY_SHARE: Record<Category, number> = {
  Billing: 0.24,
  'Access & Auth': 0.21,
  Integrations: 0.2,
  Outage: 0.08,
  Onboarding: 0.15,
  Hardware: 0.12,
}

function buildHistory(weeks = 20): WeekPoint[] {
  const r = rng(77)
  // Most recent full week starts Monday 2026-09-21
  const lastMonday = Date.UTC(2026, 8, 21)
  const out: WeekPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const idx = weeks - 1 - i
    const base = 940 + idx * 13.5
    const billingCycle = idx % 4 === 0 ? 1.11 : idx % 4 === 1 ? 1.03 : 0.95
    const incident = idx === 11 ? 1.19 : 1
    const summerDip = idx >= 5 && idx <= 7 ? 0.9 : 1
    const noise = 1 + (r() - 0.5) * 0.06
    const total = Math.round(base * billingCycle * incident * summerDip * noise)
    const byCategory = {} as Record<Category, number>
    let assigned = 0
    CATEGORIES.forEach((c, ci) => {
      let share = CATEGORY_SHARE[c] * (1 + (r() - 0.5) * 0.12)
      if (c === 'Billing') share *= billingCycle
      if (c === 'Outage' && incident > 1) share *= 2.1
      const v = ci === CATEGORIES.length - 1 ? total - assigned : Math.round(total * share)
      byCategory[c] = Math.max(0, v)
      assigned += byCategory[c]
    })
    out.push({ weekStart: new Date(lastMonday - i * 7 * DAY).toISOString().slice(0, 10), total, byCategory })
  }
  return out
}

export const WEEKLY_HISTORY: WeekPoint[] = buildHistory()

/** Share of weekly volume landing on each weekday, Monday first. */
export const WEEKDAY_SHARE = [0.188, 0.212, 0.184, 0.171, 0.142, 0.048, 0.055]
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Relative arrival intensity per hour (00–23), local time. */
export const HOURLY_PROFILE = [
  0.12, 0.08, 0.06, 0.05, 0.06, 0.1, 0.24, 0.52, 0.86, 1, 0.97, 0.92,
  0.78, 0.84, 0.88, 0.8, 0.68, 0.52, 0.38, 0.3, 0.26, 0.22, 0.18, 0.14,
]

/** Agents scheduled per weekday next week. */
export const SCHEDULED_AGENTS = [22, 22, 21, 20, 18, 6, 6]
/** Tickets a single agent comfortably closes per shift. */
export const TICKETS_PER_AGENT = 11

export const PLANNED_EVENTS = [
  { id: 'launch', label: 'Product launch', detail: 'Mobile app v4 ships Tuesday', lift: 0.16 },
  { id: 'billing', label: 'Billing run', detail: 'Annual renewals invoice on the 1st', lift: 0.07 },
  { id: 'holiday', label: 'Public holiday', detail: 'Regional holiday Friday', lift: -0.09 },
] as const

/** Trailing 12-day trends shown beside the console KPIs. */
export const KPI_TRENDS = {
  open: [21, 19, 23, 22, 25, 24, 20, 18, 22, 21, 19, 18],
  risk: [6, 5, 7, 4, 6, 8, 5, 4, 5, 6, 4, 5],
  firstResponse: [41, 38, 36, 39, 33, 31, 34, 29, 27, 30, 26, 24],
  slaMet: [91, 92, 90, 93, 94, 92, 95, 94, 96, 95, 96, 97],
}
