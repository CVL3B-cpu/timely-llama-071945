import { HeadContent, Link, Scripts, createRootRoute, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Toaster, Watermark, Wordmark } from '@/components/ui'

import '../styles.css'

const siteName = 'Tessera — Intelligent ticket operations'
const siteDescription = 'Tessera monitors every ticket in flight and forecasts next week\'s influx before it arrives.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      { name: 'theme-color', content: '#15120f' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap',
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

// Opt into scroll reveals only once JS runs, so content is never hidden without it.
const revealScript = `document.documentElement.classList.add('js-reveal')`

function NotFound() {
  return (
    <FullBleedMessage
      code="404"
      title="This ticket was never issued."
      body="The page you were looking for doesn't exist or has moved. Everything else is still accounted for."
    />
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <FullBleedMessage
      code="Error"
      title="Something slipped through."
      body={error instanceof Error ? error.message : 'An unexpected error occurred while rendering this page.'}
      onRetry={() => {
        reset()
        router.invalidate()
      }}
    />
  )
}

function FullBleedMessage({ code, title, body, onRetry }: { code: string; title: string; body: string; onRetry?: () => void }) {
  return (
    <main className="grain relative flex min-h-dvh flex-col bg-ink px-6 py-8 text-bone sm:px-10">
      <Link to="/" aria-label="Tessera home">
        <Wordmark dark />
      </Link>
      <div className="my-auto max-w-2xl py-24">
        <p className="label text-ember">{code}</p>
        <h1 className="mt-6 font-display text-display leading-[0.95]">{title}</h1>
        <p className="mt-6 max-w-md text-ash">{body}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          {onRetry && (
            <button className="btn btn-light" onClick={onRetry}>
              Try again
            </button>
          )}
          <Link to="/" className="btn btn-ghost-dark">
            Back to Tessera
          </Link>
        </div>
      </div>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: revealScript }} />
      </head>
      <body>
        {children}
        <Watermark />
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
