import type { Order } from '../domain/order';
import type { OrderRepositoryPort } from './ports';

export class ListOrdersHandler {
  constructor(private readonly orderRepo: OrderRepositoryPort) {}

  async execute(): Promise<Order[]> {
    return this.orderRepo.listAll();
  }
}
