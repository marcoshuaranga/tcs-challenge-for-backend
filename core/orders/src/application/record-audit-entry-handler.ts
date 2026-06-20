import type { AuditEntry } from '../domain/audit-entry';
import type { AuditRepositoryPort } from './ports';

export class RecordAuditEntryHandler {
  constructor(private readonly auditRepo: AuditRepositoryPort) {}

  async execute(entry: AuditEntry): Promise<void> {
    await this.auditRepo.append(entry);
  }
}
