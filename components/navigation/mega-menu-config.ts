/**
 * Mega Menu Configuration
 * Defines the structure and links for the JudgeFinder navigation mega menu
 */

export interface MegaMenuItem {
  label: string
  href: string
  description?: string
  children?: MegaMenuItem[]
}

export interface MegaMenuSection {
  id: string
  label: string
  items: MegaMenuItem[]
}

/**
 * Judges Mega Menu Configuration
 */
export const judgesMenu: MegaMenuSection[] = [
  {
    id: 'browse',
    label: 'Browse Judges',
    items: [
      {
        label: 'All Judges',
        href: '/judges',
        description: 'Complete directory of California judges',
      },
      {
        label: 'Compare Judges',
        href: '/compare',
        description: 'Side-by-side judge comparison tool',
      },
      {
        label: 'Advanced Search',
        href: '/judges/advanced-search',
        description: 'Filter by multiple criteria',
      },
    ],
  },
  {
    id: 'by-category',
    label: 'By Category',
    items: [
      {
        label: 'Veteran Judges',
        href: '/judges/veteran',
        description: '15+ years on the bench',
      },
      {
        label: 'Recently Appointed',
        href: '/judges/recently-appointed',
        description: 'New appointments and confirmations',
      },
    ],
  },
  {
    id: 'by-court',
    label: 'By Court Type',
    items: [
      {
        label: 'Superior Court',
        href: '/judges/by-court-type/superior',
        description: 'Trial court judges',
      },
      {
        label: 'Appellate Court',
        href: '/judges/by-court-type/appellate',
        description: 'Court of Appeals judges',
      },
      {
        label: 'Supreme Court',
        href: '/judges/by-court-type/supreme',
        description: 'California Supreme Court',
      },
    ],
  },
  {
    id: 'by-location',
    label: 'Top Counties',
    items: [
      {
        label: 'Los Angeles County',
        href: '/jurisdictions/los-angeles-county',
        description: 'LA Superior Court judges',
      },
      {
        label: 'Orange County',
        href: '/jurisdictions/orange-county',
        description: 'Orange County judges',
      },
      {
        label: 'San Diego County',
        href: '/jurisdictions/san-diego-county',
        description: 'San Diego judges',
      },
      {
        label: 'San Francisco County',
        href: '/jurisdictions/san-francisco-county',
        description: 'San Francisco judges',
      },
      {
        label: 'All Counties',
        href: '/jurisdictions',
        description: 'View all California counties',
      },
    ],
  },
]

/**
 * Courts Mega Menu Configuration
 */
export const courtsMenu: MegaMenuSection[] = [
  {
    id: 'browse-courts',
    label: 'Browse Courts',
    items: [
      {
        label: 'All Courts',
        href: '/courts',
        description: 'Complete California court directory',
      },
      {
        label: 'By Jurisdiction',
        href: '/jurisdictions',
        description: 'Courts organized by county',
      },
    ],
  },
  {
    id: 'court-types',
    label: 'Court Levels',
    items: [
      {
        label: 'Superior Courts',
        href: '/courts/type/superior',
        description: 'Trial courts (58 counties)',
      },
      {
        label: 'Appellate Courts',
        href: '/courts/type/appellate',
        description: 'Courts of Appeal (6 districts)',
      },
      {
        label: 'Supreme Court',
        href: '/courts/type/supreme',
        description: 'California Supreme Court',
      },
    ],
  },
]

/**
 * Resources Mega Menu Configuration
 */
export const resourcesMenu: MegaMenuSection[] = [
  {
    id: 'tools',
    label: 'Research Tools',
    items: [
      {
        label: 'Legal Research Tools',
        href: '/legal-research-tools',
        description: 'Case law and statutory research',
      },
      {
        label: 'Judicial Analytics',
        href: '/judicial-analytics',
        description: 'Judicial decision patterns',
      },
      {
        label: 'Case Analytics',
        href: '/analytics',
        description: 'Case outcome analysis',
      },
    ],
  },
  {
    id: 'directories',
    label: 'Directories',
    items: [
      {
        label: 'Attorney Directory',
        href: '/for-attorneys',
        description: 'Legal professional resources',
      },
      {
        label: 'Help Center',
        href: '/help-center',
        description: 'Guides and FAQs',
      },
      {
        label: 'Documentation',
        href: '/docs',
        description: 'Platform documentation',
      },
    ],
  },
]

/**
 * Combined menu configuration for easy import
 */
export const megaMenuConfig = {
  judges: judgesMenu,
  courts: courtsMenu,
  resources: resourcesMenu,
} as const

export type MegaMenuType = keyof typeof megaMenuConfig
