import { OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
import type { AuditEntry } from '../domain/audit-entry';
import type { AuditRepositoryPort, OrderRepositoryPort } from './ports';

export class GetOrderAuditHandler {
  constructor(
    private readonly orderRepo: OrderRepositoryPort,
    private readonly auditRepo: AuditRepositoryPort,
  ) {}

  async execute(query: { orderId: string }): Promise<AuditEntry[]> {
    const order = await this.orderRepo.findById(query.orderId);
    if (!order) throw new OrderNotFoundError(query.orderId);
    return this.auditRepo.findByOrderId(query.orderId);
  }
}
