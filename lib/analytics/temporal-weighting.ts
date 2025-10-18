/**
 * Temporal Weighting Module
 * Applies temporal decay to weight recent cases more heavily
 * Improves accuracy of pattern detection by prioritizing current judicial behavior
 */

export interface WeightedCase<T = any> {
  case_data: T
  weight: number
  years_old: number
  decay_factor: number
}

export interface TemporalWeightConfig {
  decay_rate?: number // Default 0.95 (5% decay per year)
  min_weight?: number // Minimum weight for oldest cases (default 0.5)
  reference_date?: Date // Date to calculate age from (default: now)
}

/**
 * Calculate years between two dates
 */
function calculateYearsOld(caseDate: Date, referenceDate: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000
  const diff = referenceDate.getTime() - caseDate.getTime()
  return Math.max(0, diff / msPerYear)
}

/**
 * Calculate decay weight based on age
 * Formula: weight = max(min_weight, decay_rate^years_old)
 */
function calculateWeight(yearsOld: number, decayRate: number, minWeight: number): number {
  const weight = Math.pow(decayRate, yearsOld)
  return Math.max(minWeight, weight)
}

/**
 * Apply temporal decay weighting to cases
 * More recent cases receive higher weights
 */
export function applyTemporalDecay<
  T extends { filing_date?: string | null; decision_date?: string | null },
>(cases: T[], config: TemporalWeightConfig = {}): WeightedCase<T>[] {
  const decayRate = config.decay_rate ?? 0.95
  const minWeight = config.min_weight ?? 0.5
  const referenceDate = config.reference_date ?? new Date()

  const weightedCases: WeightedCase<T>[] = []

  for (const caseRecord of cases) {
    // Use decision_date if available, otherwise filing_date
    const dateStr = caseRecord.decision_date || caseRecord.filing_date

    if (!dateStr) {
      // If no date, assign minimum weight
      weightedCases.push({
        case_data: caseRecord,
        weight: minWeight,
        years_old: 99, // Arbitrary large number
        decay_factor: decayRate,
      })
      continue
    }

    try {
      const caseDate = new Date(dateStr)

      if (Number.isNaN(caseDate.getTime())) {
        // Invalid date, assign minimum weight
        weightedCases.push({
          case_data: caseRecord,
          weight: minWeight,
          years_old: 99,
          decay_factor: decayRate,
        })
        continue
      }

      const yearsOld = calculateYearsOld(caseDate, referenceDate)
      const weight = calculateWeight(yearsOld, decayRate, minWeight)

      weightedCases.push({
        case_data: caseRecord,
        weight,
        years_old: yearsOld,
        decay_factor: decayRate,
      })
    } catch {
      // Error parsing date, assign minimum weight
      weightedCases.push({
        case_data: caseRecord,
        weight: minWeight,
        years_old: 99,
        decay_factor: decayRate,
      })
    }
  }

  return weightedCases
}

/**
 * Calculate weighted average of a metric
 * Useful for computing settlement rates, grant rates, etc. with temporal weighting
 */
export function calculateWeightedAverage(
  values: number[],
  weights: number[]
): { average: number; total_weight: number } {
  if (values.length === 0 || values.length !== weights.length) {
    return { average: 0, total_weight: 0 }
  }

  let weightedSum = 0
  let totalWeight = 0

  for (let i = 0; i < values.length; i++) {
    weightedSum += values[i] * weights[i]
    totalWeight += weights[i]
  }

  const average = totalWeight > 0 ? weightedSum / totalWeight : 0

  return { average, total_weight: totalWeight }
}

/**
 * Calculate weighted rate for boolean outcomes
 * E.g., settlement rate, motion grant rate
 */
export function calculateWeightedRate<T>(
  weightedCases: WeightedCase<T>[],
  predicate: (caseData: T) => boolean
): { rate: number; total_weight: number; positive_weight: number } {
  let positiveWeight = 0
  let totalWeight = 0

  for (const weightedCase of weightedCases) {
    totalWeight += weightedCase.weight

    if (predicate(weightedCase.case_data)) {
      positiveWeight += weightedCase.weight
    }
  }

  const rate = totalWeight > 0 ? positiveWeight / totalWeight : 0

  return {
    rate,
    total_weight: totalWeight,
    positive_weight: positiveWeight,
  }
}

/**
 * Calculate weighted standard deviation
 */
export function calculateWeightedStdDev(
  values: number[],
  weights: number[],
  weightedMean: number
): number {
  if (values.length === 0 || values.length !== weights.length) {
    return 0
  }

  let weightedVarianceSum = 0
  let totalWeight = 0

  for (let i = 0; i < values.length; i++) {
    const deviation = values[i] - weightedMean
    weightedVarianceSum += weights[i] * deviation * deviation
    totalWeight += weights[i]
  }

  const variance = totalWeight > 0 ? weightedVarianceSum / totalWeight : 0

  return Math.sqrt(variance)
}

/**
 * Get effective case count (sum of weights)
 * Used for confidence scoring with temporal weighting
 */
export function getEffectiveCaseCount<T>(weightedCases: WeightedCase<T>[]): number {
  return weightedCases.reduce((sum, wc) => sum + wc.weight, 0)
}

/**
 * Filter cases by weight threshold
 * Useful for excluding very old cases that contribute little to analysis
 */
export function filterByWeight<T>(
  weightedCases: WeightedCase<T>[],
  minWeight: number
): WeightedCase<T>[] {
  return weightedCases.filter((wc) => wc.weight >= minWeight)
}

/**
 * Get weight distribution summary
 * Helpful for understanding temporal distribution of case data
 */
export function getWeightDistribution<T>(weightedCases: WeightedCase<T>[]): {
  total_cases: number
  effective_cases: number
  avg_weight: number
  min_weight: number
  max_weight: number
  recent_cases_pct: number // Cases within 1 year
  old_cases_pct: number // Cases older than 3 years
} {
  if (weightedCases.length === 0) {
    return {
      total_cases: 0,
      effective_cases: 0,
      avg_weight: 0,
      min_weight: 0,
      max_weight: 0,
      recent_cases_pct: 0,
      old_cases_pct: 0,
    }
  }

  const weights = weightedCases.map((wc) => wc.weight)
  const effectiveCases = weights.reduce((sum, w) => sum + w, 0)
  const avgWeight = effectiveCases / weightedCases.length

  const recentCases = weightedCases.filter((wc) => wc.years_old <= 1).length
  const oldCases = weightedCases.filter((wc) => wc.years_old > 3).length

  return {
    total_cases: weightedCases.length,
    effective_cases: effectiveCases,
    avg_weight: avgWeight,
    min_weight: Math.min(...weights),
    max_weight: Math.max(...weights),
    recent_cases_pct: (recentCases / weightedCases.length) * 100,
    old_cases_pct: (oldCases / weightedCases.length) * 100,
  }
}

/**
 * Apply temporal grouping
 * Groups cases by time periods for trend analysis
 */
export function groupByTimePeriod<
  T extends { filing_date?: string | null; decision_date?: string | null },
>(cases: T[], periodType: 'year' | 'quarter' | 'month' = 'year'): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const caseRecord of cases) {
    const dateStr = caseRecord.decision_date || caseRecord.filing_date
    if (!dateStr) continue

    try {
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) continue

      let key: string
      const year = date.getFullYear()
      const month = date.getMonth() + 1

      switch (periodType) {
        case 'year':
          key = `${year}`
          break
        case 'quarter':
          key = `${year}-Q${Math.ceil(month / 3)}`
          break
        case 'month':
          key = `${year}-${String(month).padStart(2, '0')}`
          break
        default:
          key = `${year}`
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(caseRecord)
    } catch {
      // Skip invalid dates
    }
  }

  return groups
}
