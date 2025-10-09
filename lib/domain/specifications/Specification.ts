/**
 * Specification Pattern
 *
 * Encapsulates business rules as reusable, composable predicates.
 * Enables complex validation logic with clear semantics.
 */

export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean
  and(other: ISpecification<T>): ISpecification<T>
  or(other: ISpecification<T>): ISpecification<T>
  not(): ISpecification<T>
}

export abstract class Specification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other)
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other)
  }

  not(): ISpecification<T> {
    return new NotSpecification(this)
  }
}

class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
  }
}

class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
  }
}

class NotSpecification<T> extends Specification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate)
  }
}
