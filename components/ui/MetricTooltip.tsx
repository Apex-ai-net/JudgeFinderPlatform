import { InfoTooltip } from './InfoTooltip'

interface MetricTooltipProps {
  metric: 'total-cases' | 'reversal-rate' | 'decision-time' | 'education'
  className?: string
}

const METRIC_CONTENT = {
  'total-cases': {
    content:
      'Total number of rulings, decisions, and case outcomes parsed from CourtListener, state court records, and verified public sources. Includes civil, criminal, and administrative cases.',
    learnMoreUrl: '/docs/methodology#total-cases',
    learnMoreText: 'How we count cases',
  },
  'reversal-rate': {
    content:
      "Percentage of this judge's decisions that were reversed or modified on appeal. Calculated from appellate court records. Lower rates may indicate careful decision-making, but many factors affect this metric.",
    learnMoreUrl: '/docs/methodology#reversal-rate',
    learnMoreText: 'Understanding reversal rates',
  },
  'decision-time': {
    content:
      'Median number of days from case filing to final decision or significant ruling. Based on available court records. Does not include cases still pending. Shorter times may indicate efficiency, but case complexity varies.',
    learnMoreUrl: '/docs/methodology#decision-timeline',
    learnMoreText: 'How we calculate timing',
  },
  education: {
    content:
      "Educational background sourced from CourtListener's comprehensive judicial database, which aggregates information from judicial biographies, bar records, and official court profiles.",
    learnMoreUrl: '/docs/methodology#data-sources',
    learnMoreText: 'About our data sources',
  },
}

export function MetricTooltip({ metric, className }: MetricTooltipProps): JSX.Element {
  const config = METRIC_CONTENT[metric]

  return (
    <InfoTooltip
      content={config.content}
      label={`Learn more about this metric`}
      learnMoreUrl={config.learnMoreUrl}
      learnMoreText={config.learnMoreText}
      position="top"
      className={className}
    />
  )
}
