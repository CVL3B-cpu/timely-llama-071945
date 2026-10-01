import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import {
  INITIAL_TICKETS,
  PRIORITIES,
  SNAPSHOT,
  STAGES,
  AGENTS,
  type Category,
  type Channel,
  type Priority,
  type Stage,
  type Ticket,
} from './fixtures'

/**
 * Client state for the console. Milestone 1 keeps tickets in memory, seeded
 * from fixtures; the action signatures mirror the API a later milestone will
 * expose, so components won't need to change when persistence lands.
 */
interface QueueState {
  tickets: Ticket[]
  /** Offset applied to SNAPSHOT so the console clock ticks forward in-session */
  clockOffset: number
  seq: number
}

export const queueStore = new Store<QueueState>({
  tickets: INITIAL_TICKETS,
  clockOffset: 0,
  seq: 2482,
})

export const now = () => SNAPSHOT + queueStore.state.clockOffset

export function useQueue<T>(selector: (s: QueueState) => T) {
  return useStore(queueStore, selector)
}

function patch(id: string, fn: (t: Ticket) => Ticket) {
  queueStore.setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? fn(t) : t)) }))
}

export function setStage(id: string, stage: Stage, by = 'You') {
  const at = now()
  patch(id, (t) =>
    t.stage === stage
      ? t
      : {
          ...t,
          stage,
          updatedAt: at,
          events: [...t.events, { at, kind: 'stage', by, label: `Moved to ${STAGES.find((s) => s.id === stage)!.label}` }],
        },
  )
}

export function assign(id: string, agentId: string | null) {
  const at = now()
  const name = AGENTS.find((a) => a.id === agentId)?.name
  patch(id, (t) => ({
    ...t,
    assigneeId: agentId,
    updatedAt: at,
    events: [...t.events, { at, kind: 'assign', by: 'You', label: name ? `Assigned to ${name}` : 'Unassigned' }],
  }))
}

export function addNote(id: string, note: string) {
  const at = now()
  patch(id, (t) => ({ ...t, updatedAt: at, events: [...t.events, { at, kind: 'note', by: 'You', label: note }] }))
}

export interface NewTicketInput {
  title: string
  description: string
  name: string
  email: string
  org: string
  channel: Channel
  category: Category
  priority: Priority
  confidence: number
}

export function createTicket(input: NewTicketInput): Ticket {
  const at = now()
  const id = `TS-${queueStore.state.seq}`
  const sla = PRIORITIES.find((p) => p.id === input.priority)!.slaHours
  const ticket: Ticket = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    requester: { name: input.name.trim(), email: input.email.trim(), org: input.org.trim() || 'Independent' },
    channel: input.channel,
    category: input.category,
    priority: input.priority,
    stage: 'new',
    assigneeId: null,
    createdAt: at,
    updatedAt: at,
    slaDueAt: at + sla * 3_600_000,
    ai: {
      confidence: input.confidence,
      sentiment: input.priority === 'P1' ? 'urgent' : input.priority === 'P2' ? 'frustrated' : 'calm',
      summary: `Logged manually. Suggested routing: ${input.category}.`,
    },
    events: [
      { at, kind: 'created', by: input.name.trim(), label: `Logged via ${input.channel}` },
      { at, kind: 'ai', by: 'Tessera AI', label: `Classified as ${input.category} · ${input.priority} · ${Math.round(input.confidence * 100)}% confidence` },
    ],
  }
  queueStore.setState((s) => ({ ...s, tickets: [ticket, ...s.tickets], seq: s.seq + 1 }))
  return ticket
}

/* ── Toasts ───────────────────────────────────────────────── */

export interface Toast {
  id: number
  title: string
  body?: string
  tone?: 'default' | 'success' | 'error'
}

export const toastStore = new Store<Toast[]>([])
let toastId = 0

export function toast(t: Omit<Toast, 'id'>) {
  const id = ++toastId
  toastStore.setState((s) => [...s.slice(-2), { ...t, id }])
  setTimeout(() => dismissToast(id), 4200)
}

export function dismissToast(id: number) {
  toastStore.setState((s) => s.filter((t) => t.id !== id))
}
