import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { CATEGORIES, CHANNELS, PRIORITIES, type Category, type Channel, type Priority } from '@/lib/fixtures'
import { createTicket, toast } from '@/lib/store'
import { triage } from '@/lib/triage'
import { cn } from '@/lib/format'

interface Values {
  title: string
  description: string
  name: string
  email: string
  org: string
  channel: Channel
  category: Category | ''
  priority: Priority | ''
}

const EMPTY: Values = { title: '', description: '', name: '', email: '', org: '', channel: 'Email', category: '', priority: '' }

type Errors = Partial<Record<keyof Values, string>>

function validate(v: Values): Errors {
  const e: Errors = {}
  if (v.title.trim().length < 6) e.title = 'Give the ticket a subject of at least 6 characters.'
  if (v.description.trim().length < 20) e.description = 'Describe the issue in at least 20 characters so it can be triaged.'
  if (!v.name.trim()) e.name = 'Add the requester’s name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Enter a valid email address, like name@company.com.'
  if (!v.category) e.category = 'Choose a category, or apply the suggestion.'
  if (!v.priority) e.priority = 'Choose a priority.'
  return e
}

export function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [v, setV] = useState<Values>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [manual, setManual] = useState({ category: false, priority: false })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const errors = validate(v)
  const show = (k: keyof Values) => (submitted || touched[k]) && errors[k]
  const guess = useMemo(() => triage(`${v.title}. ${v.description}`), [v.title, v.description])

  // Auto-apply the suggestion until the user picks a value themselves
  useEffect(() => {
    if (!guess) return
    setV((p) => ({
      ...p,
      category: manual.category ? p.category : guess.category,
      priority: manual.priority ? p.priority : guess.priority,
    }))
  }, [guess?.category, guess?.priority, manual.category, manual.priority])

  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }))
  const blur = (k: keyof Values) => () => setTouched((t) => ({ ...t, [k]: true }))

  const reset = () => {
    setV(EMPTY)
    setTouched({})
    setSubmitted(false)
    setManual({ category: false, priority: false })
  }

  const close = () => {
    if (saving) return
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) {
      const first = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 650))
    const t = createTicket({
      ...v,
      category: v.category as Category,
      priority: v.priority as Priority,
      confidence: guess && guess.category === v.category ? guess.confidence : 1,
    })
    setSaving(false)
    toast({ title: `${t.id} created`, body: `${t.category} · ${t.priority} — added to the top of the queue.`, tone: 'success' })
    reset()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (saving) e.preventDefault()
      }}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="new-ticket-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[34rem] bg-transparent p-0 backdrop:bg-ink/50 backdrop:backdrop-blur-sm open:animate-[sheet-in_.5s_var(--ease-out-expo)] max-sm:mt-auto max-sm:h-[94dvh] max-sm:max-w-none"
    >
      <form onSubmit={submit} noValidate className="flex h-full flex-col bg-paper shadow-float sm:rounded-l-[24px] max-sm:rounded-t-[24px]">
        <header className="flex items-start justify-between gap-6 border-b hairline px-6 pt-6 pb-5 sm:px-8">
          <div>
            <p className="label text-graphite">New ticket</p>
            <h2 id="new-ticket-title" className="mt-2 font-display text-4xl leading-none">
              Log a request
            </h2>
          </div>
          <button type="button" onClick={close} className="-m-2 rounded-full p-2 text-graphite hover:bg-bone-2 hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
          <Field label="Subject" error={show('title')}>
            {(id, d) => (
              <input id={id} aria-describedby={d} aria-invalid={!!show('title')} className="field" value={v.title} onChange={(e) => set('title', e.target.value)} onBlur={blur('title')} placeholder="e.g. SSO login loops back to sign-in" autoComplete="off" />
            )}
          </Field>
          <Field label="What's happening?" error={show('description')} hint={`${v.description.trim().length}/20 minimum`}>
            {(id, d) => (
              <textarea id={id} aria-describedby={d} aria-invalid={!!show('description')} rows={4} className="field" value={v.description} onChange={(e) => set('description', e.target.value)} onBlur={blur('description')} placeholder="Steps, impact, who is affected…" />
            )}
          </Field>

          {/* Live triage */}
          <div className={cn('rounded-[14px] p-4 transition-colors duration-500', guess ? 'bg-ink text-bone' : 'bg-bone-2 text-graphite')} aria-live="polite">
            <p className="flex items-center gap-2 text-sm">
              <Sparkles className={cn('size-4', guess ? 'text-ember' : 'text-stone')} />
              {guess ? (
                <span>
                  Suggested <strong className="font-medium">{guess.category}</strong> · <strong className="font-medium">{guess.priority}</strong>
                  <span className="ml-2 font-mono text-xs text-ash">{Math.round(guess.confidence * 100)}% confidence</span>
                </span>
              ) : (
                'Tessera suggests a category and priority as you describe the issue.'
              )}
            </p>
            {guess && (manual.category || manual.priority) && (v.category !== guess.category || v.priority !== guess.priority) && (
              <button
                type="button"
                className="mt-3 text-xs text-ember-soft link-underline"
                onClick={() => {
                  setManual({ category: false, priority: false })
                }}
              >
                Apply suggestion
              </button>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" error={show('category')}>
              {(id, d) => (
                <select id={id} aria-describedby={d} aria-invalid={!!show('category')} className="field" value={v.category} onChange={(e) => { setManual((m) => ({ ...m, category: true })); set('category', e.target.value as Category) }} onBlur={blur('category')}>
                  <option value="" disabled>Select…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
            </Field>
            <Field label="Priority" error={show('priority')}>
              {(id, d) => (
                <select id={id} aria-describedby={d} aria-invalid={!!show('priority')} className="field" value={v.priority} onChange={(e) => { setManual((m) => ({ ...m, priority: true })); set('priority', e.target.value as Priority) }} onBlur={blur('priority')}>
                  <option value="" disabled>Select…</option>
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.label} ({p.slaHours}h SLA)</option>)}
                </select>
              )}
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Channel</legend>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <label key={c} className={cn('cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ember', v.channel === c ? 'bg-ink text-bone' : 'bg-bone-2 text-graphite hover:text-ink')}>
                  <input type="radio" name="channel" value={c} checked={v.channel === c} onChange={() => set('channel', c)} className="sr-only" />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border-t hairline pt-5">
            <p className="label mb-4 text-graphite">Requester</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" error={show('name')}>
                {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!show('name')} className="field" value={v.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')} autoComplete="name" />}
              </Field>
              <Field label="Organisation" hint="Optional">
                {(id, d) => <input id={id} aria-describedby={d} className="field" value={v.org} onChange={(e) => set('org', e.target.value)} autoComplete="organization" />}
              </Field>
            </div>
            <div className="mt-5">
              <Field label="Email" error={show('email')}>
                {(id, d) => <input id={id} type="email" aria-describedby={d} aria-invalid={!!show('email')} className="field" value={v.email} onChange={(e) => set('email', e.target.value)} onBlur={blur('email')} autoComplete="email" placeholder="name@company.com" />}
              </Field>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t hairline px-6 py-4 sm:px-8">
          <button type="button" onClick={() => { reset() }} className="text-sm text-graphite link-underline hover:text-ink" disabled={saving}>
            Clear form
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="btn btn-ghost btn-sm" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm min-w-32" disabled={saving}>
              {saving ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : 'Create ticket'}
            </button>
          </div>
        </footer>
      </form>
      <style>{`@keyframes sheet-in{from{transform:translate3d(24px,0,0);opacity:0}}@media (max-width:639px){@keyframes sheet-in{from{transform:translate3d(0,32px,0);opacity:0}}}`}</style>
    </dialog>
  )
}

export function Field({ label, error, hint, children }: { label: string; error?: string | false; hint?: string; children: (id: string, describedBy: string | undefined) => ReactNode }) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && !error && <span className="text-xs text-stone">{hint}</span>}
      </div>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="mt-1.5 animate-rise text-xs text-ember-deep">
          {error}
        </p>
      ) : hint ? (
        <span id={msgId} className="sr-only">{hint}</span>
      ) : null}
    </div>
  )
}
