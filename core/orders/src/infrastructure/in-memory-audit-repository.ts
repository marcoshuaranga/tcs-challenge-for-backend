import type { AuditRepositoryPort } from '../application/ports';
import type { AuditEntry } from '../domain/audit-entry';

export class InMemoryAuditRepository implements AuditRepositoryPort {
  readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByOrderId(orderId: string): Promise<AuditEntry[]> {
    return this.entries.filter((e) => e.orderId === orderId);
  }
}
