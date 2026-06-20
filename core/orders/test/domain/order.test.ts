import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { Money } from '../../src/domain/money';

describe('Order', () => {
  const idGen = new UuidGenerator();
  const clock = new SystemClock();

  it('Order.create() sets status to PENDING', () => {
    const id = OrderId.generate(idGen);
    const money = Money.create(50, 'USD');
    const order = Order.create({ id, customerId: 'C1', money, clock });
    expect(order.status).toBe('PENDING');
  });

  it('Order.create() sets all required fields', () => {
    const id = OrderId.generate(idGen);
    const money = Money.create(50, 'USD');
    const order = Order.create({ id, customerId: 'C1', money, clock });
    expect(order.id).toBe(id.value);
    expect(order.customerId).toBe('C1');
    expect(order.money.amount).toBe(50);
    expect(order.money.currency).toBe('USD');
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
  });

  it('createdAt equals updatedAt after creation', () => {
    const id = OrderId.generate(idGen);
    const money = Money.create(50, 'USD');
    const order = Order.create({ id, customerId: 'C1', money, clock });
    expect(order.createdAt.getTime()).toBe(order.updatedAt.getTime());
  });
});
