/** Netlify Image CDN helpers — never ship full-resolution originals. */
export function cdn(src: string, w: number, opts: { h?: number; q?: number; fit?: 'cover' | 'contain' } = {}) {
  const p = new URLSearchParams({ url: src, w: String(w), fm: 'webp', q: String(opts.q ?? 78) })
  if (opts.h) p.set('h', String(opts.h))
  if (opts.fit) p.set('fit', opts.fit)
  return `/.netlify/images?${p.toString()}`
}

export function srcSet(src: string, widths: number[], opts: { q?: number } = {}) {
  return widths.map((w) => `${cdn(src, w, opts)} ${w}w`).join(', ')
}
