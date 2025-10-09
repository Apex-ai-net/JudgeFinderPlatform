/**
 * Domain Events
 *
 * Represents significant business events that occur in the domain.
 * Events are immutable and carry all necessary information about what happened.
 *
 * Domain events enable:
 * - Decoupling between aggregates
 * - Audit trail of business actions
 * - Event-driven architectures
 * - Side-effect triggering
 */

export interface DomainEvent {
  eventId: string
  eventType: string
  occurredAt: Date
  aggregateId: string
  aggregateType: string
  version: number
  metadata?: Record<string, unknown>
}

/**
 * Base class for domain events
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string
  public readonly occurredAt: Date
  public readonly version: number = 1

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    this.eventId = this.generateEventId()
    this.occurredAt = new Date()
  }

  private generateEventId(): string {
    return `${this.aggregateType}-${this.aggregateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      version: this.version,
      metadata: this.metadata,
    }
  }
}

/**
 * Judge Assigned to Court Event
 *
 * Fired when a judge is assigned to a new court position.
 */
export class JudgeAssignedToCourt extends BaseDomainEvent {
  constructor(
    public readonly judgeId: string,
    public readonly courtId: string,
    public readonly courtName: string,
    public readonly assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired',
    public readonly startDate: Date,
    public readonly positionTitle?: string
  ) {
    super('JudgeAssignedToCourt', judgeId, 'Judge', {
      courtId,
      courtName,
      assignmentType,
      startDate: startDate.toISOString(),
      positionTitle,
    })
  }
}

/**
 * Judge Retired Event
 *
 * Fired when a judge retires from a position or from service entirely.
 */
export class JudgeRetired extends BaseDomainEvent {
  constructor(
    public readonly judgeId: string,
    public readonly courtId: string,
    public readonly retirementDate: Date,
    public readonly retirementType: 'full' | 'senior_status' | 'temporary',
    public readonly yearsOfService: number
  ) {
    super('JudgeRetired', judgeId, 'Judge', {
      courtId,
      retirementDate: retirementDate.toISOString(),
      retirementType,
      yearsOfService,
    })
  }
}

/**
 * Judge Eligible for Bias Analysis Event
 *
 * Fired when a judge meets the minimum requirements for bias analysis.
 */
export class JudgeEligibleForBiasAnalysis extends BaseDomainEvent {
  constructor(
    public readonly judgeId: string,
    public readonly totalCases: number,
    public readonly minimumRequired: number
  ) {
    super('JudgeEligibleForBiasAnalysis', judgeId, 'Judge', {
      totalCases,
      minimumRequired,
      eligibleSince: new Date().toISOString(),
    })
  }
}

/**
 * Bias Metrics Calculated Event
 *
 * Fired when bias metrics are successfully calculated for a judge.
 */
export class BiasMetricsCalculated extends BaseDomainEvent {
  constructor(
    public readonly judgeId: string,
    public readonly metrics: {
      consistencyScore: number
      speedScore: number
      settlementPreference: number
      riskTolerance: number
      predictabilityScore: number
    },
    public readonly casesAnalyzed: number
  ) {
    super('BiasMetricsCalculated', judgeId, 'Judge', {
      metrics,
      casesAnalyzed,
      calculatedAt: new Date().toISOString(),
    })
  }
}

/**
 * Court Assignment Conflict Detected Event
 *
 * Fired when a judge is assigned to multiple courts simultaneously.
 */
export class CourtAssignmentConflictDetected extends BaseDomainEvent {
  constructor(
    public readonly judgeId: string,
    public readonly existingCourtId: string,
    public readonly newCourtId: string,
    public readonly conflictType:
      | 'temporal_overlap'
      | 'multiple_primary_positions'
      | 'jurisdiction_mismatch'
  ) {
    super('CourtAssignmentConflictDetected', judgeId, 'Judge', {
      existingCourtId,
      newCourtId,
      conflictType,
      detectedAt: new Date().toISOString(),
    })
  }
}

/**
 * Ad Campaign Created Event
 *
 * Fired when a new advertising campaign is created.
 */
export class AdCampaignCreated extends BaseDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly advertiserId: string,
    public readonly campaignName: string,
    public readonly budget: number,
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    super('AdCampaignCreated', campaignId, 'AdCampaign', {
      advertiserId,
      campaignName,
      budget,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
  }
}

/**
 * Ad Spot Booked Event
 *
 * Fired when an advertiser books an ad spot.
 */
export class AdSpotBooked extends BaseDomainEvent {
  constructor(
    public readonly spotId: string,
    public readonly campaignId: string,
    public readonly entityType: 'judge' | 'court',
    public readonly entityId: string,
    public readonly price: number,
    public readonly duration: number
  ) {
    super('AdSpotBooked', spotId, 'AdSpot', {
      campaignId,
      entityType,
      entityId,
      price,
      duration,
      bookedAt: new Date().toISOString(),
    })
  }
}

/**
 * Advertiser Verified Event
 *
 * Fired when an advertiser's bar number is successfully verified.
 */
export class AdvertiserVerified extends BaseDomainEvent {
  constructor(
    public readonly advertiserId: string,
    public readonly barNumber: string,
    public readonly barState: string,
    public readonly verificationMethod: 'automatic' | 'manual' | 'api'
  ) {
    super('AdvertiserVerified', advertiserId, 'Advertiser', {
      barNumber,
      barState,
      verificationMethod,
      verifiedAt: new Date().toISOString(),
    })
  }
}

/**
 * Domain Event Publisher
 *
 * Handles registration and dispatching of domain events.
 */
export class DomainEventPublisher {
  private static handlers: Map<string, Array<(event: DomainEvent) => void>> = new Map()

  /**
   * Registers a handler for a specific event type
   */
  static register(eventType: string, handler: (event: DomainEvent) => void): void {
    const handlers = this.handlers.get(eventType) || []
    handlers.push(handler)
    this.handlers.set(eventType, handlers)
  }

  /**
   * Publishes an event to all registered handlers
   */
  static async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || []

    // Execute handlers sequentially to maintain order
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error(`Error handling event ${event.eventType}:`, error)
        // Continue processing other handlers
      }
    }
  }

  /**
   * Publishes multiple events in order
   */
  static async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  /**
   * Clears all handlers (useful for testing)
   */
  static clearHandlers(): void {
    this.handlers.clear()
  }

  /**
   * Gets the number of handlers for an event type
   */
  static getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0
  }
}

/**
 * Domain Event Store
 *
 * Stores events for event sourcing and audit trails.
 */
export class DomainEventStore {
  private events: DomainEvent[] = []

  /**
   * Appends an event to the store
   */
  append(event: DomainEvent): void {
    this.events.push(event)
  }

  /**
   * Gets all events for an aggregate
   */
  getEventsForAggregate(aggregateId: string): DomainEvent[] {
    return this.events.filter((e) => e.aggregateId === aggregateId)
  }

  /**
   * Gets all events of a specific type
   */
  getEventsByType(eventType: string): DomainEvent[] {
    return this.events.filter((e) => e.eventType === eventType)
  }

  /**
   * Gets all events
   */
  getAllEvents(): DomainEvent[] {
    return [...this.events]
  }

  /**
   * Clears all events (useful for testing)
   */
  clear(): void {
    this.events = []
  }

  /**
   * Gets event count
   */
  getEventCount(): number {
    return this.events.length
  }
}
