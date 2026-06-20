import { describe, expect, it } from 'vitest';
import { RecordAuditEntryHandler } from '../../src/application/record-audit-entry-handler';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import type { AuditEntry } from '../../src/domain/audit-entry';

describe('RecordAuditEntryHandler', () => {
  it('execute(entry) appends to audit repository', async () => {
    const repo = new InMemoryAuditRepository();
    const handler = new RecordAuditEntryHandler(repo);
    const entry: AuditEntry = {
      orderId: 'order-1',
      event: 'ORDER_CREATED',
      previousState: null,
      newState: 'PENDING',
      timestamp: new Date(),
    };
    await handler.execute(entry);
    expect(repo.entries).toHaveLength(1);
    expect(repo.entries[0]).toEqual(entry);
  });
});
