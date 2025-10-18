import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataUnavailableNoteProps {
  fieldName: string
  reason: 'no-data' | 'pending-enrichment' | 'insufficient-cases'
  className?: string
  inline?: boolean
}

const REASON_MESSAGES = {
  'no-data': {
    text: 'Data not yet available',
    explanation: 'This information is not currently in our database',
    docLink: '/docs/methodology#data-coverage',
  },
  'pending-enrichment': {
    text: 'Pending enrichment',
    explanation: 'We are actively gathering this data from public sources',
    docLink: '/docs/methodology#data-pipeline',
  },
  'insufficient-cases': {
    text: 'Insufficient case data',
    explanation: 'We need more case records to calculate this metric reliably',
    docLink: '/docs/methodology#statistical-confidence',
  },
}

export function DataUnavailableNote({
  fieldName,
  reason,
  className,
  inline = false,
}: DataUnavailableNoteProps): JSX.Element {
  const config = REASON_MESSAGES[reason]

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="text-sm">{config.text}</span>
        <Link
          href={config.docLink}
          className="text-xs text-primary hover:text-foreground transition-colors underline"
        >
          Learn why
        </Link>
      </span>
    )
  }

  return (
    <div
      className={cn('rounded-lg border border-border/50 bg-muted/30 p-3 text-sm', className)}
      role="status"
      aria-label={`${fieldName} data unavailable`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-foreground">{config.text}</p>
          <p className="text-xs text-muted-foreground">{config.explanation}</p>
          <Link
            href={config.docLink}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-foreground transition-colors font-medium"
          >
            Learn more about our data coverage →
          </Link>
        </div>
      </div>
    </div>
  )
}
