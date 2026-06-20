import { InvalidStateTransitionError } from '@tcs-challenge-for-backend/kernel';
import type { ClockPort } from '@tcs-challenge-for-backend/kernel';
import type { OrderId } from './order-id';
import type { Money } from './money';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export class Order {
  private constructor(
    readonly id: string,
    readonly customerId: string,
    readonly money: Money,
    readonly status: OrderStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly failureReason?: string,
  ) {}

  static create(props: { id: OrderId; customerId: string; money: Money; clock: ClockPort }): Order {
    const now = props.clock.now();
    return new Order(props.id.value, props.customerId, props.money, 'PENDING', now, now);
  }

  startProcessing(clock: ClockPort): Order {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionError(this.status, 'PROCESSING');
    }
    return new Order(
      this.id,
      this.customerId,
      this.money,
      'PROCESSING',
      this.createdAt,
      clock.now(),
    );
  }

  complete(clock: ClockPort): Order {
    if (this.status !== 'PROCESSING') {
      throw new InvalidStateTransitionError(this.status, 'COMPLETED');
    }
    return new Order(
      this.id,
      this.customerId,
      this.money,
      'COMPLETED',
      this.createdAt,
      clock.now(),
    );
  }

  fail(reason: string, clock: ClockPort): Order {
    if (this.status !== 'PROCESSING') {
      throw new InvalidStateTransitionError(this.status, 'FAILED');
    }
    return new Order(
      this.id,
      this.customerId,
      this.money,
      'FAILED',
      this.createdAt,
      clock.now(),
      reason,
    );
  }
}
