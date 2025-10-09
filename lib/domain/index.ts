/**
 * Domain Layer Exports
 *
 * Central export point for all domain components.
 * Use this to import domain objects throughout the application.
 *
 * @example
 * import { JudgeAggregate, Money, Result } from '@/lib/domain'
 */

// Result Monad and Error Types
export {
  Result,
  DomainError,
  ValidationError,
  BusinessRuleViolationError,
  InvariantViolationError,
  type Ok,
  type Err,
} from './Result'

// Value Objects
export { BarNumber, type USState } from './value-objects/BarNumber'
export { Jurisdiction, type JurisdictionLevel } from './value-objects/Jurisdiction'
export { Money, type Currency } from './value-objects/Money'

// Aggregates
export {
  JudgeAggregate,
  type JudgeProps,
  type CourtPosition,
  type BiasMetrics,
} from './aggregates/JudgeAggregate'

// Domain Services
export {
  CourtAssignmentService,
  type AssignmentValidation,
  type AssignmentConflict,
} from './services/CourtAssignmentService'

export {
  AdPricingService,
  type PricingFactors,
  type PricingBreakdown,
  type CourtLevel,
  type PricingTier,
} from './services/AdPricingService'

// Specifications
export { type ISpecification, Specification } from './specifications/Specification'

export {
  MinimumCaseRequirementSpec,
  ActivePositionRequiredSpec,
  PrimaryPositionRequiredSpec,
  JurisdictionMatchSpec,
  BiasMetricsAvailableSpec,
  CourtAssignmentSpec,
  BiasAnalysisEligibilitySpec,
  SeniorStatusEligibilitySpec,
  AdvertisingEligibilitySpec,
  HighProfileJudgeSpec,
} from './specifications/JudgeEligibilitySpec'

// Domain Events
export {
  type DomainEvent,
  BaseDomainEvent,
  JudgeAssignedToCourt,
  JudgeRetired,
  JudgeEligibleForBiasAnalysis,
  BiasMetricsCalculated,
  CourtAssignmentConflictDetected,
  AdCampaignCreated,
  AdSpotBooked,
  AdvertiserVerified,
  DomainEventPublisher,
  DomainEventStore,
} from './events/DomainEvents'
