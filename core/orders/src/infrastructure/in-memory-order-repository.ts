import type { OrderRepositoryPort } from '../application/ports';
import type { Order } from '../domain/order';

export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly store = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.store.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.store.get(id) ?? null;
  }
}
