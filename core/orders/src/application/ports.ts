import type { AuditEntry } from '../domain/audit-entry';
import type { Order } from '../domain/order';

export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

export interface AuditRepositoryPort {
  append(entry: AuditEntry): Promise<void>;
  findByOrderId(orderId: string): Promise<AuditEntry[]>;
}

export interface MessagePublisherPort {
  publishProcessOrder(orderId: string): Promise<void>;
}

export interface PaymentGatewayPort {
  authorize(order: Order): Promise<{ approved: boolean }>;
}
