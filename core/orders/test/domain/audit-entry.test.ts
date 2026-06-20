import { describe, expect, it } from 'vitest';
import type { AuditEntry } from '../../src/domain/audit-entry';

describe('AuditEntry', () => {
  it('ORDER_CREATED entry has previousState null and newState PENDING', () => {
    const entry: AuditEntry = {
      orderId: 'order-1',
      event: 'ORDER_CREATED',
      previousState: null,
      newState: 'PENDING',
      timestamp: new Date(),
    };
    expect(entry.previousState).toBeNull();
    expect(entry.newState).toBe('PENDING');
    expect(entry.event).toBe('ORDER_CREATED');
  });
});
