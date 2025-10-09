# Domain Layer - JudgeFinder Platform

This directory contains the domain-driven design (DDD) implementation for the JudgeFinder platform. The domain layer encapsulates core business logic, rules, and invariants independent of infrastructure concerns.

## Architecture Overview

```
lib/domain/
├── value-objects/     # Immutable objects defined by their attributes
├── entities/          # Objects with unique identity
├── aggregates/        # Cluster of entities and value objects
├── services/          # Stateless domain services for complex logic
├── specifications/    # Reusable business rule predicates
├── events/           # Domain events for aggregate communication
└── Result.ts         # Functional error handling monad
```

## Core Concepts

### Value Objects

Immutable objects identified by their values, not identity. Enforce validation and business rules at construction.

**BarNumber** (`value-objects/BarNumber.ts`)

- Represents attorney bar numbers with state jurisdiction
- Validates format and state codes
- Ensures data consistency across the platform

```typescript
import { BarNumber } from '@/lib/domain/value-objects/BarNumber'

const result = BarNumber.create('CA', '123456')
if (result.isOk()) {
  const barNumber = result.unwrap()
  console.log(barNumber.toString()) // "CA-123456"
}
```

**Jurisdiction** (`value-objects/Jurisdiction.ts`)

- Hierarchical jurisdiction representation (federal/state/county)
- Supports jurisdictional containment checks
- Handles parsing and normalization

```typescript
import { Jurisdiction } from '@/lib/domain/value-objects/Jurisdiction'

const county = Jurisdiction.county('California', 'Los Angeles').unwrap()
const state = Jurisdiction.state('California').unwrap()

console.log(county.isWithin(state)) // true
```

**Money** (`value-objects/Money.ts`)

- Precise monetary calculations without floating-point errors
- Currency-aware arithmetic operations
- Percentage calculations and discounts

```typescript
import { Money } from '@/lib/domain/value-objects/Money'

const price = Money.fromDollars(100).unwrap()
const discounted = price.applyDiscount(15).unwrap() // 15% off
console.log(discounted.toFormattedString()) // "$85.00"
```

### Aggregates

Clusters of domain objects treated as a single unit for data changes. Each aggregate has a root entity that controls access.

**JudgeAggregate** (`aggregates/JudgeAggregate.ts`)

- Root aggregate for judge-related business logic
- Enforces business rules:
  - Minimum 500 cases for bias metrics calculation
  - Single active primary position per judge
  - No temporal overlap in court assignments
  - Retirement must follow temporal ordering

```typescript
import { JudgeAggregate } from '@/lib/domain/aggregates/JudgeAggregate'

const judge = JudgeAggregate.create({
  id: 'judge-1',
  name: 'Judge Smith',
  totalCases: 600,
  positions: [],
  jurisdiction: 'California',
}).unwrap()

// Assign to court (validates business rules)
const result = judge.assignToCourt(
  'court-1',
  'Superior Court of California',
  'primary',
  new Date('2020-01-01')
)

// Calculate bias metrics (requires 500+ cases)
if (judge.canCalculateBiasMetrics()) {
  judge.calculateBiasMetrics({
    consistencyScore: 85,
    speedScore: 75,
    settlementPreference: 10,
    riskTolerance: 60,
    predictabilityScore: 80,
  })
}

// Collect domain events for publishing
const events = judge.collectDomainEvents()
```

### Domain Services

Stateless services that encapsulate business logic spanning multiple aggregates or requiring external dependencies.

**CourtAssignmentService** (`services/CourtAssignmentService.ts`)

- Validates complex court assignment rules
- Detects temporal overlaps and conflicts
- Calculates workload distribution
- Recommends assignment transitions

```typescript
import { CourtAssignmentService } from '@/lib/domain/services/CourtAssignmentService'

const service = new CourtAssignmentService()

// Validate proposed assignment
const validation = service
  .validateAssignment(
    judge,
    'court-1',
    'Superior Court',
    'primary',
    new Date('2020-01-01'),
    'California'
  )
  .unwrap()

if (!validation.isValid) {
  console.log('Errors:', validation.errors)
  console.log('Warnings:', validation.warnings)
}

// Detect conflicts
const conflicts = service.detectConflicts(judge, 'court-1', 'primary', new Date('2020-01-01'))
```

**AdPricingService** (`services/AdPricingService.ts`)

- Calculates advertising pricing with complex rules:
  - Federal court multiplier (2x)
  - Premium judge multiplier (1.3x)
  - Exclusive placement multiplier (1.5x)
  - Volume discounts (10-20% based on bundle size)
  - Annual discounts (2 months free)

```typescript
import { AdPricingService } from '@/lib/domain/services/AdPricingService'

const pricingService = new AdPricingService()

const breakdown = pricingService
  .calculatePricing({
    tier: 'premium',
    courtLevel: 'federal',
    isExclusive: true,
    isPremiumJudge: true,
    bundleSize: 5,
    durationMonths: 12,
  })
  .unwrap()

console.log('Final Price:', breakdown.finalPrice.toFormattedString())
console.log('Savings:', breakdown.savings.toFormattedString())
console.log('Per Month:', breakdown.pricePerMonth.toFormattedString())
```

### Specifications

Reusable business rule predicates using the Specification pattern. Enable composable validation logic.

**Judge Eligibility Specifications** (`specifications/JudgeEligibilitySpec.ts`)

```typescript
import {
  MinimumCaseRequirementSpec,
  ActivePositionRequiredSpec,
  BiasAnalysisEligibilitySpec,
} from '@/lib/domain/specifications/JudgeEligibilitySpec'

// Simple specifications
const hasEnoughCases = new MinimumCaseRequirementSpec(500)
const isActive = new ActivePositionRequiredSpec()

// Composite specification
const biasEligibility = new BiasAnalysisEligibilitySpec(500)
const status = biasEligibility.getEligibilityStatus(judge)

if (!status.eligible) {
  console.log('Not eligible:', status.reasons)
}

// Specification composition
const spec = hasEnoughCases.and(isActive)
console.log(spec.isSatisfiedBy(judge)) // true/false
```

### Domain Events

Immutable notifications about significant business occurrences. Enable loose coupling between aggregates.

**Available Events** (`events/DomainEvents.ts`)

- `JudgeAssignedToCourt` - Judge assigned to a court position
- `JudgeRetired` - Judge retired from position
- `JudgeEligibleForBiasAnalysis` - Judge met bias analysis requirements
- `BiasMetricsCalculated` - Bias metrics calculated for judge
- `CourtAssignmentConflictDetected` - Assignment conflict detected
- `AdCampaignCreated` - Advertising campaign created
- `AdSpotBooked` - Ad spot booked by advertiser
- `AdvertiserVerified` - Advertiser bar number verified

```typescript
import { DomainEventPublisher } from '@/lib/domain/events/DomainEvents'

// Register event handler
DomainEventPublisher.register('JudgeAssignedToCourt', async (event) => {
  console.log(`Judge ${event.aggregateId} assigned to court`)
  // Send notification, update read models, etc.
})

// Events are automatically published by aggregates
judge.assignToCourt(...)
const events = judge.collectDomainEvents()
await DomainEventPublisher.publishAll(events)
```

### Result Monad

Functional error handling without exceptions. Makes error paths explicit and composable.

**Basic Usage** (`Result.ts`)

```typescript
import { Result } from '@/lib/domain/Result'

// Creating Results
const success = Result.ok(42)
const failure = Result.err(new Error('Something went wrong'))

// Pattern matching
const value = result.match({
  ok: (val) => val * 2,
  err: (error) => {
    console.error(error)
    return 0
  },
})

// Chaining operations
const result = validateInput(input)
  .map((normalized) => normalized.toUpperCase())
  .flatMap((upper) => lookupInDatabase(upper))
  .tapErr((error) => logError(error))

// Unwrapping (use with caution)
if (result.isOk()) {
  const value = result.unwrap()
}
```

**Domain Error Types**

- `DomainError` - Base domain error class
- `ValidationError` - Input validation failures
- `BusinessRuleViolationError` - Business rule violations
- `InvariantViolationError` - Aggregate invariant violations

```typescript
import { ValidationError, BusinessRuleViolationError } from '@/lib/domain/Result'

// Validation error
return Result.err(
  new ValidationError('Bar number must be 4-12 characters', {
    provided: barNumber,
    length: barNumber.length,
  })
)

// Business rule violation
return Result.err(
  new BusinessRuleViolationError('Judge already has an active primary position', {
    judgeId,
    existingCourt,
    newCourt,
  })
)
```

## Testing

All domain components have comprehensive unit tests:

```bash
npm test -- tests/unit/domain
```

**Test Coverage:**

- Value Objects: 100% (all validation rules)
- Aggregates: 95%+ (all business rules)
- Domain Services: 90%+ (all pricing scenarios)
- Specifications: 100% (all composition patterns)

## Best Practices

### 1. Always Use Result for Fallible Operations

```typescript
// ✅ Good
function createBarNumber(state: string, number: string): Result<BarNumber, ValidationError> {
  return BarNumber.create(state, number)
}

// ❌ Bad (throws exceptions)
function createBarNumber(state: string, number: string): BarNumber {
  if (!isValid(state)) throw new Error('Invalid state')
  return new BarNumber(state, number)
}
```

### 2. Validate at Construction

```typescript
// ✅ Good - Value object validates on creation
const money = Money.fromDollars(amount)
if (money.isErr()) {
  return money // Propagate error
}

// ❌ Bad - Validation after creation
const money = new Money(amount)
if (money.isNegative()) {
  // Too late - invalid object exists
}
```

### 3. Keep Aggregates Small

```typescript
// ✅ Good - Judge aggregate focuses on judge logic
class JudgeAggregate {
  assignToCourt(...) { }
  calculateBiasMetrics(...) { }
}

// ❌ Bad - Aggregate doing too much
class JudgeAggregate {
  assignToCourt(...) { }
  processPayment(...) { }
  sendNotification(...) { }
}
```

### 4. Use Domain Services for Cross-Aggregate Logic

```typescript
// ✅ Good - Service coordinates multiple aggregates
class CourtAssignmentService {
  validateAssignment(judge, court, ...) {
    // Logic spanning judge and court
  }
}

// ❌ Bad - Aggregate knows about another aggregate
class JudgeAggregate {
  assignToCourt(court: CourtAggregate) {
    // Judge shouldn't reference Court aggregate
  }
}
```

### 5. Publish Domain Events for Side Effects

```typescript
// ✅ Good - Event published, handlers react
judge.assignToCourt(...)
const events = judge.collectDomainEvents()
await DomainEventPublisher.publishAll(events)
// Handler sends notification

// ❌ Bad - Direct coupling
judge.assignToCourt(...)
await emailService.sendAssignmentNotification(judge)
```

## Integration with Application Layer

The domain layer is consumed by the application layer (use cases) and API routes:

```typescript
// app/api/judges/[id]/assign/route.ts
import { JudgeAggregate } from '@/lib/domain/aggregates/JudgeAggregate'
import { CourtAssignmentService } from '@/lib/domain/services/CourtAssignmentService'

export async function POST(request: Request) {
  // 1. Load judge aggregate from database
  const judgeData = await db.judges.findUnique({ where: { id } })
  const judge = JudgeAggregate.fromJSON(judgeData).unwrap()

  // 2. Validate using domain service
  const service = new CourtAssignmentService()
  const validation = service.validateAssignment(...)

  if (!validation.unwrap().isValid) {
    return NextResponse.json({ error: validation.errors }, { status: 400 })
  }

  // 3. Execute business logic
  const result = judge.assignToCourt(...)
  if (result.isErr()) {
    return NextResponse.json({ error: result.error().message }, { status: 400 })
  }

  // 4. Persist and publish events
  await db.judges.update({ where: { id }, data: judge.toJSON() })
  await DomainEventPublisher.publishAll(judge.collectDomainEvents())

  return NextResponse.json({ success: true })
}
```

## Future Enhancements

- [ ] Court Aggregate for court-specific business rules
- [ ] AdCampaign Aggregate for campaign management
- [ ] Event Sourcing for full audit trail
- [ ] CQRS separation for read/write optimization
- [ ] Sagas for long-running processes
- [ ] Domain Event versioning

## References

- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Domain Modeling Made Functional by Scott Wlaschin
