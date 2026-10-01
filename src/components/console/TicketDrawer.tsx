import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { AGENTS, STAGES } from '@/lib/fixtures'
import { addNote, assign, now, setStage, toast, useQueue } from '@/lib/store'
import { clockTime, cn, relTime, shortDate, slaOf } from '@/lib/format'
import { PriorityMark, SlaMeter, StagePill } from '@/components/ui'

export function TicketDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const ticket = useQueue((s) => s.tickets.find((t) => t.id === id) ?? null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (id && !d.open) d.showModal()
    if (!id && d.open) d.close()
    setNote('')
    setNoteError('')
  }, [id])

  const at = now()
  const sla = ticket ? slaOf(ticket, at) : null
  const idx = ticket ? STAGES.findIndex((s) => s.id === ticket.stage) : 0

  const submitNote = (e: FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (note.trim().length < 3) {
      setNoteError('Notes need at least 3 characters.')
      return
    }
    addNote(ticket.id, note.trim())
    setNote('')
    setNoteError('')
    toast({ title: 'Note added', body: ticket.id })
  }

  const advance = () => {
    if (!ticket || idx >= STAGES.length - 1) return
    const next = STAGES[idx + 1]
    setStage(ticket.id, next.id)
    toast({ title: `${ticket.id} → ${next.label}`, tone: next.id === 'resolved' ? 'success' : 'default' })
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="ticket-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[38rem] bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-[drawer-in_.55s_var(--ease-out-expo)]"
    >
      {ticket && sla && (
        <div className="flex h-full flex-col bg-paper shadow-float sm:rounded-l-[24px]">
          <header className="border-b hairline px-6 pt-6 pb-6 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-graphite">{ticket.id}</span>
                <PriorityMark priority={ticket.priority} showLabel />
              </div>
              <button onClick={onClose} className="-m-2 rounded-full p-2 text-graphite hover:bg-bone-2 hover:text-ink" aria-label="Close ticket">
                <X className="size-5" />
              </button>
            </div>
            <h2 id="ticket-title" className="mt-4 font-display text-[2.1rem] leading-[1.05] text-balance">
              {ticket.title}
            </h2>
            <p className="mt-3 text-sm text-graphite">
              {ticket.requester.name} · {ticket.requester.org} · via {ticket.channel} · {relTime(ticket.createdAt, at)}
            </p>
          </header>

          <div className="flex-1 overflow-y-auto">
            {/* Stage stepper */}
            <section className="px-6 pt-6 sm:px-8" aria-labelledby="progress-h">
              <div className="flex items-center justify-between">
                <h3 id="progress-h" className="label text-graphite">
                  Progress
                </h3>
                <StagePill stage={ticket.stage} />
              </div>
              <ol className="mt-4 grid grid-cols-5 gap-1.5">
                {STAGES.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setStage(ticket.id, s.id)
                        if (s.id !== ticket.stage) toast({ title: `${ticket.id} → ${s.label}` })
                      }}
                      aria-pressed={ticket.stage === s.id}
                      className="group w-full text-left"
                    >
                      <span
                        className={cn(
                          'block h-1.5 rounded-full transition-colors duration-500',
                          i < idx ? 'bg-ink' : i === idx ? (s.id === 'resolved' ? 'bg-sage' : 'bg-ember') : 'bg-bone-3 group-hover:bg-mist',
                        )}
                      />
                      <span className={cn('mt-2 block text-[11px] leading-tight', i <= idx ? 'text-ink' : 'text-stone group-hover:text-graphite')}>{s.short}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-6 grid gap-px border-y hairline bg-[rgb(21_18_15/0.08)] sm:grid-cols-2" aria-label="Service level and ownership">
              <div className="bg-paper px-6 py-5 sm:px-8">
                <p className="label text-graphite">SLA · due {shortDate(ticket.slaDueAt)} {clockTime(ticket.slaDueAt)}</p>
                <div className="mt-3">
                  <SlaMeter {...sla} />
                </div>
              </div>
              <div className="bg-paper px-6 py-5 sm:px-8">
                <label htmlFor="assignee" className="label text-graphite">
                  Assignee
                </label>
                <select
                  id="assignee"
                  className="field mt-2 h-10"
                  value={ticket.assigneeId ?? ''}
                  onChange={(e) => {
                    assign(ticket.id, e.target.value || null)
                    toast({ title: e.target.value ? `Assigned to ${AGENTS.find((a) => a.id === e.target.value)!.name}` : 'Ticket unassigned' })
                  }}
                >
                  <option value="">Unassigned</option>
                  {AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.role}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* AI read */}
            <section className="px-6 pt-6 sm:px-8">
              <div className="rounded-[16px] bg-ink p-5 text-bone">
                <div className="flex items-center justify-between">
                  <p className="label flex items-center gap-2 text-ash">
                    <Sparkles className="size-3.5 text-ember" /> Tessera read
                  </p>
                  <span className="font-mono text-xs text-ash">{Math.round(ticket.ai.confidence * 100)}% · {ticket.category}</span>
                </div>
                <p className="mt-3 text-[0.95rem] leading-relaxed">{ticket.ai.summary}</p>
                <p className="mt-3 text-xs text-ash">
                  Tone: <span className={cn(ticket.ai.sentiment === 'urgent' ? 'text-ember-soft' : 'text-bone')}>{ticket.ai.sentiment}</span>
                </p>
              </div>
            </section>

            <section className="px-6 pt-7 sm:px-8">
              <h3 className="label text-graphite">Original message</h3>
              <p className="mt-3 max-w-[60ch] leading-relaxed">{ticket.description}</p>
              <p className="mt-2 font-mono text-xs text-graphite">{ticket.requester.email}</p>
            </section>

            {/* Timeline */}
            <section className="px-6 pt-8 pb-8 sm:px-8" aria-labelledby="timeline-h">
              <h3 id="timeline-h" className="label text-graphite">
                Timeline
              </h3>
              <form onSubmit={submitNote} className="mt-4" noValidate>
                <label htmlFor="note" className="sr-only">
                  Add an internal note
                </label>
                <div className="flex gap-2">
                  <input
                    id="note"
                    className="field"
                    placeholder="Add an internal note…"
                    value={note}
                    aria-invalid={!!noteError}
                    aria-describedby={noteError ? 'note-err' : undefined}
                    onChange={(e) => {
                      setNote(e.target.value)
                      if (noteError) setNoteError('')
                    }}
                  />
                  <button type="submit" className="btn btn-primary shrink-0">
                    Add
                  </button>
                </div>
                {noteError && (
                  <p id="note-err" className="mt-1.5 text-xs text-ember-deep">
                    {noteError}
                  </p>
                )}
              </form>
              <ol className="mt-6 space-y-5 border-l hairline pl-5">
                {[...ticket.events].reverse().map((e, i) => (
                  <li key={`${e.at}-${i}`} className="relative">
                    <span
                      className={cn(
                        'absolute top-1.5 -left-[1.42rem] size-2 rounded-full ring-4 ring-paper',
                        i === 0 ? 'bg-ember' : e.kind === 'ai' ? 'bg-ochre' : e.kind === 'note' ? 'bg-graphite' : 'bg-ink',
                      )}
                    />
                    <p className={cn('text-sm', e.kind === 'note' && 'rounded-[10px] bg-bone-2 px-3 py-2')}>{e.label}</p>
                    <p className="mt-1 font-mono text-[11px] text-graphite">
                      {e.by} · {shortDate(e.at)} {clockTime(e.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t hairline px-6 py-4 sm:px-8">
            <span className="text-xs text-graphite">Updated {relTime(ticket.updatedAt, at)}</span>
            {ticket.stage === 'resolved' ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setStage(ticket.id, 'in_progress')}>
                Reopen
              </button>
            ) : (
              <div className="flex gap-2">
                {ticket.stage !== 'waiting' && idx < 3 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setStage(ticket.id, 'resolved'); toast({ title: `${ticket.id} resolved`, tone: 'success' }) }}>
                    <Check className="size-4" /> Resolve
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={advance}>
                  Move to {STAGES[idx + 1].short}
                </button>
              </div>
            )}
          </footer>
        </div>
      )}
      <style>{`@keyframes drawer-in{from{transform:translate3d(32px,0,0);opacity:0}}`}</style>
    </dialog>
  )
}
