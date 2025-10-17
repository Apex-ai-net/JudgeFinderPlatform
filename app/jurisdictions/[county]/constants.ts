import { JurisdictionMetadata } from './types'

export const jurisdictionMap: Record<string, JurisdictionMetadata> = {
  'los-angeles-county': {
    displayName: 'Los Angeles County',
    jurisdictionValue: 'CA',
    countyName: 'Los Angeles',
    description:
      'Largest judicial system in California with comprehensive trial and appellate courts.',
  },
  'orange-county': {
    displayName: 'Orange County',
    jurisdictionValue: 'CA',
    countyName: 'Orange',
    description:
      'Major Southern California jurisdiction serving diverse communities and businesses.',
  },
  'san-diego-county': {
    displayName: 'San Diego County',
    jurisdictionValue: 'CA',
    countyName: 'San Diego',
    description: 'Southern California coastal jurisdiction with federal and state court systems.',
  },
  'san-francisco-county': {
    displayName: 'San Francisco County',
    jurisdictionValue: 'CA',
    countyName: 'San Francisco',
    description: 'Metropolitan jurisdiction with specialized business and technology courts.',
  },
  'sacramento-county': {
    displayName: 'Sacramento County',
    jurisdictionValue: 'CA',
    countyName: 'Sacramento',
    description: 'Capital region jurisdiction serving Sacramento and surrounding communities.',
  },
  'santa-clara-county': {
    displayName: 'Santa Clara County',
    jurisdictionValue: 'CA',
    countyName: 'Santa Clara',
    description: 'Silicon Valley jurisdiction handling technology and intellectual property cases.',
  },
  'alameda-county': {
    displayName: 'Alameda County',
    jurisdictionValue: 'CA',
    countyName: 'Alameda',
    description: 'Bay Area jurisdiction with diverse civil and criminal caseloads.',
  },
  california: {
    displayName: 'California',
    jurisdictionValue: 'CA',
    description: 'State courts across California handling various civil and criminal matters.',
  },
  federal: {
    displayName: 'Federal',
    jurisdictionValue: 'F',
    description: 'Federal courts handling federal matters across California districts.',
  },
  texas: {
    displayName: 'Texas',
    jurisdictionValue: 'TX',
    description: 'Texas state courts and federal courts in Texas jurisdictions.',
  },
}
