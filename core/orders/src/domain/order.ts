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
  ) {}

  static create(props: { id: OrderId; customerId: string; money: Money; clock: ClockPort }): Order {
    const now = props.clock.now();
    return new Order(props.id.value, props.customerId, props.money, 'PENDING', now, now);
  }
}
