import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEntry } from '../../src/domain/audit-entry';
import type { AuditItem } from '../../src/infrastructure/dynamo-entities';
import { DynamoAuditRepository } from '../../src/infrastructure/dynamo-audit-repository';

const TABLE = 'orders-table';

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    orderId: 'order-1',
    event: 'ORDER_CREATED',
    previousState: null,
    newState: 'PENDING',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function makeClient(response: unknown = {}) {
  return { send: vi.fn().mockResolvedValue(response) } as unknown as DynamoDBDocumentClient;
}

function toItem(entry: AuditEntry, skSuffix = 'uuid'): AuditItem {
  return {
    PK: `ORDER#${entry.orderId}`,
    SK: `AUDIT#${entry.timestamp.toISOString()}#${skSuffix}`,
    orderId: entry.orderId,
    event: entry.event,
    previousState: entry.previousState,
    newState: entry.newState,
    timestamp: entry.timestamp.toISOString(),
    ...(entry.reason != null ? { reason: entry.reason } : {}),
  };
}

function sentCmd(client: DynamoDBDocumentClient) {
  return (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe('DynamoAuditRepository', () => {
  describe('append', () => {
    it('sends PutCommand with PK=ORDER#<orderId> and SK starting with AUDIT#<timestamp>', async () => {
      const entry = makeEntry();
      const client = makeClient({});
      await new DynamoAuditRepository(client, TABLE).append(entry);
      const cmd = sentCmd(client);
      expect(cmd).toBeInstanceOf(PutCommand);
      const item = cmd.input.Item;
      expect(item.PK).toBe('ORDER#order-1');
      expect(item.SK).toMatch(/^AUDIT#2024-01-01T10:00:00\.000Z#/);
      expect(item.orderId).toBe('order-1');
      expect(item.event).toBe('ORDER_CREATED');
      expect(item.previousState).toBeNull();
      expect(item.newState).toBe('PENDING');
      expect(item.timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('includes reason when entry has one', async () => {
      const client = makeClient({});
      await new DynamoAuditRepository(client, TABLE).append(
        makeEntry({ reason: 'payment_declined' }),
      );
      expect(sentCmd(client).input.Item.reason).toBe('payment_declined');
    });

    it('omits reason key when entry has none', async () => {
      const client = makeClient({});
      await new DynamoAuditRepository(client, TABLE).append(makeEntry());
      expect('reason' in sentCmd(client).input.Item).toBe(false);
    });
  });

  describe('findByOrderId', () => {
    it('sends QueryCommand with correct PK, AUDIT# prefix and ScanIndexForward=true', async () => {
      const client = makeClient({ Items: [] });
      await new DynamoAuditRepository(client, TABLE).findByOrderId('order-1');
      const cmd = sentCmd(client);
      expect(cmd).toBeInstanceOf(QueryCommand);
      expect(cmd.input.ExpressionAttributeValues[':pk']).toBe('ORDER#order-1');
      expect(cmd.input.ExpressionAttributeValues[':prefix']).toBe('AUDIT#');
      expect(cmd.input.ScanIndexForward).toBe(true);
    });

    it('returns empty array when Items is undefined', async () => {
      const result = await new DynamoAuditRepository(makeClient({}), TABLE).findByOrderId('x');
      expect(result).toEqual([]);
    });

    it('maps items to AuditEntry with Date timestamps', async () => {
      const entry = makeEntry();
      const client = makeClient({ Items: [toItem(entry)] });
      const found = await new DynamoAuditRepository(client, TABLE).findByOrderId('order-1');
      expect(found).toHaveLength(1);
      expect(found[0].orderId).toBe('order-1');
      expect(found[0].event).toBe('ORDER_CREATED');
      expect(found[0].previousState).toBeNull();
      expect(found[0].newState).toBe('PENDING');
      expect(found[0].timestamp).toBeInstanceOf(Date);
      expect(found[0].timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z');
    });

    it('maps reason when present', async () => {
      const entry = makeEntry({ reason: 'payment_declined' });
      const client = makeClient({ Items: [toItem(entry)] });
      const found = await new DynamoAuditRepository(client, TABLE).findByOrderId('order-1');
      expect(found[0].reason).toBe('payment_declined');
    });
  });
});
