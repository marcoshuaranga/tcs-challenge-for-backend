import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { FakePaymentGateway } from '../../src/infrastructure/fake-payment-gateway';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { Money } from '../../src/domain/money';

const clock = new SystemClock();
const idGen = new UuidGenerator();

function makeOrder(amount: number) {
  const id = OrderId.generate(idGen);
  const money = Money.create(amount, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock });
}

describe('FakePaymentGateway', () => {
  it('approves when amount <= failAboveAmount', async () => {
    const gateway = new FakePaymentGateway(100);
    const result = await gateway.authorize(makeOrder(100));
    expect(result).toEqual({ approved: true });
  });

  it('declines when amount > failAboveAmount', async () => {
    const gateway = new FakePaymentGateway(100);
    const result = await gateway.authorize(makeOrder(101));
    expect(result).toEqual({ approved: false });
  });

  it('approves when failAboveAmount is Infinity', async () => {
    const gateway = new FakePaymentGateway(Infinity);
    const result = await gateway.authorize(makeOrder(999999));
    expect(result).toEqual({ approved: true });
  });
});
