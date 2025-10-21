'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Application Error
            </h2>

            <p className="text-muted-foreground mb-6">
              A critical error occurred. Please refresh the page.
            </p>

            <button
              onClick={() => reset()}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md border-none cursor-pointer text-base hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}