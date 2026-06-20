import { describe, expect, it } from 'vitest';
import {
  UuidGenerator,
  SystemClock,
  InvalidStateTransitionError,
} from '@tcs-challenge-for-backend/kernel';
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

describe('Order state machine', () => {
  const idGen = new UuidGenerator();
  const clock = new SystemClock();

  function makePendingOrder() {
    const id = OrderId.generate(idGen);
    const money = Money.create(50, 'USD');
    return Order.create({ id, customerId: 'C1', money, clock });
  }

  describe('startProcessing', () => {
    it('PENDING → PROCESSING', () => {
      const next = makePendingOrder().startProcessing(clock);
      expect(next.status).toBe('PROCESSING');
    });

    it('updatedAt is a Date', () => {
      const next = makePendingOrder().startProcessing(clock);
      expect(next.updatedAt).toBeInstanceOf(Date);
    });

    it('PROCESSING → throws InvalidStateTransitionError', () => {
      const processing = makePendingOrder().startProcessing(clock);
      expect(() => processing.startProcessing(clock)).toThrow(InvalidStateTransitionError);
    });

    it('COMPLETED → throws InvalidStateTransitionError', () => {
      const completed = makePendingOrder().startProcessing(clock).complete(clock);
      expect(() => completed.startProcessing(clock)).toThrow(InvalidStateTransitionError);
    });

    it('FAILED → throws InvalidStateTransitionError', () => {
      const failed = makePendingOrder().startProcessing(clock).fail('payment_declined', clock);
      expect(() => failed.startProcessing(clock)).toThrow(InvalidStateTransitionError);
    });
  });

  describe('complete', () => {
    it('PROCESSING → COMPLETED', () => {
      const completed = makePendingOrder().startProcessing(clock).complete(clock);
      expect(completed.status).toBe('COMPLETED');
    });

    it('PENDING → throws InvalidStateTransitionError', () => {
      expect(() => makePendingOrder().complete(clock)).toThrow(InvalidStateTransitionError);
    });
  });

  describe('fail', () => {
    it('PROCESSING → FAILED with failureReason', () => {
      const failed = makePendingOrder().startProcessing(clock).fail('payment_declined', clock);
      expect(failed.status).toBe('FAILED');
      expect(failed.failureReason).toBe('payment_declined');
    });

    it('PENDING → throws InvalidStateTransitionError', () => {
      expect(() => makePendingOrder().fail('payment_declined', clock)).toThrow(
        InvalidStateTransitionError,
      );
    });
  });
});
