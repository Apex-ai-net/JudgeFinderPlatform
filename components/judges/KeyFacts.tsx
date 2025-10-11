import type { Judge } from '@/types'

interface KeyFactsProps {
  judge: Judge
}

export default function KeyFacts({ judge }: KeyFactsProps): JSX.Element | null {
  if (!judge || typeof judge.total_cases !== 'number' || judge.total_cases < 500) {
    // Business rule: require ≥500 cases; hide section when insufficient
    return null
  }

  const facts: { label: string; value: string }[] = []

  facts.push({ label: 'Total cases analyzed', value: judge.total_cases.toLocaleString() })

  if (typeof judge.reversal_rate === 'number') {
    const pct = Math.max(0, Math.min(100, Math.round(judge.reversal_rate)))
    facts.push({ label: 'Reversal rate', value: `${pct}%` })
  }

  if (typeof judge.average_decision_time === 'number' && judge.average_decision_time > 0) {
    facts.push({
      label: 'Average decision time',
      value: `${Math.round(judge.average_decision_time)} days`,
    })
  }

  return (
    <section aria-labelledby="key-facts-heading" className="scroll-mt-24">
      <h2 id="key-facts-heading" className="text-xl font-semibold text-foreground mb-3">
        Key facts (data-backed)
      </h2>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <ul className="grid gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <li key={f.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium text-foreground">{f.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Facts shown only when sufficient data (≥500 cases) is available. No conclusions are
          implied beyond the displayed metrics.
        </p>
      </div>
    </section>
  )
}
