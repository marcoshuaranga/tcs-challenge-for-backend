import type { PaymentGatewayPort } from '../application/ports';
import type { Order } from '../domain/order';

export class FakePaymentGateway implements PaymentGatewayPort {
  constructor(private readonly failAboveAmount: number) {}

  async authorize(order: Order): Promise<{ approved: boolean }> {
    return { approved: order.money.amount <= this.failAboveAmount };
  }
}
