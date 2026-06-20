import { OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
import type { Order } from '../domain/order';
import type { OrderRepositoryPort } from './ports';

export class GetOrderHandler {
  constructor(private readonly orderRepo: OrderRepositoryPort) {}

  async execute(query: { orderId: string }): Promise<Order> {
    const order = await this.orderRepo.findById(query.orderId);
    if (!order) throw new OrderNotFoundError(query.orderId);
    return order;
  }
}
