import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Table } from 'dynamodb-toolbox';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEntry } from '../../src/domain/audit-entry';
import { createAuditEntity } from '../../src/infrastructure/dynamo-entities';
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

function makeRepoAndMock(response: unknown = {}) {
  const mockSend = vi.fn().mockResolvedValue(response);
  const table = new Table({
    name: TABLE,
    partitionKey: { name: 'PK', type: 'string' },
    sortKey: { name: 'SK', type: 'string' },
    indexes: {
      GSI1: {
        type: 'global',
        partitionKey: { name: 'GSI1PK', type: 'string' },
        sortKey: { name: 'GSI1SK', type: 'string' },
      },
    },
    documentClient: { send: mockSend } as unknown as DynamoDBDocumentClient,
  });
  const entity = createAuditEntity(table);
  const repo = new DynamoAuditRepository(entity);
  return { repo, mockSend };
}

function toRawItem(entry: AuditEntry, skSuffix = 'uuid') {
  return {
    PK: `ORDER#${entry.orderId}`,
    SK: `AUDIT#${entry.timestamp.toISOString()}#${skSuffix}`,
    orderId: entry.orderId,
    event: entry.event,
    newState: entry.newState,
    timestamp: entry.timestamp.toISOString(),
    ...(entry.previousState != null ? { previousState: entry.previousState } : {}),
    ...(entry.reason != null ? { reason: entry.reason } : {}),
  };
}

function sentCmd(mockSend: ReturnType<typeof vi.fn>) {
  return mockSend.mock.calls[0][0];
}

describe('DynamoAuditRepository', () => {
  describe('append', () => {
    it('sends PutCommand with PK=ORDER#<orderId> and SK starting with AUDIT#<timestamp>', async () => {
      const entry = makeEntry();
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.append(entry);
      const cmd = sentCmd(mockSend);
      expect(cmd).toBeInstanceOf(PutCommand);
      const item = cmd.input.Item;
      expect(item.PK).toBe('ORDER#order-1');
      expect(item.SK).toMatch(/^AUDIT#2024-01-01T10:00:00\.000Z#/);
      expect(item.orderId).toBe('order-1');
      expect(item.event).toBe('ORDER_CREATED');
      expect(item.previousState).toBeUndefined();
      expect(item.newState).toBe('PENDING');
      expect(item.timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('includes reason when entry has one', async () => {
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.append(makeEntry({ reason: 'payment_declined' }));
      expect(sentCmd(mockSend).input.Item.reason).toBe('payment_declined');
    });

    it('omits reason key when entry has none', async () => {
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.append(makeEntry());
      expect('reason' in sentCmd(mockSend).input.Item).toBe(false);
    });
  });

  describe('findByOrderId', () => {
    it('sends QueryCommand with PK=ORDER#<id> and SK beginsWith AUDIT#', async () => {
      const { repo, mockSend } = makeRepoAndMock({ Items: [] });
      await repo.findByOrderId('order-1');
      const cmd = sentCmd(mockSend);
      expect(cmd).toBeInstanceOf(QueryCommand);
      const values = Object.values(cmd.input.ExpressionAttributeValues);
      expect(values).toContain('ORDER#order-1');
      expect(values).toContain('AUDIT#');
    });

    it('sends QueryCommand in ascending order (no ScanIndexForward=false)', async () => {
      const { repo, mockSend } = makeRepoAndMock({ Items: [] });
      await repo.findByOrderId('order-1');
      const cmd = sentCmd(mockSend);
      expect(cmd.input.ScanIndexForward).not.toBe(false);
    });

    it('returns empty array when Items is undefined', async () => {
      const { repo } = makeRepoAndMock({});
      const result = await repo.findByOrderId('x');
      expect(result).toEqual([]);
    });

    it('maps items to AuditEntry with Date timestamps', async () => {
      const entry = makeEntry();
      const { repo } = makeRepoAndMock({ Items: [toRawItem(entry)] });
      const found = await repo.findByOrderId('order-1');
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
      const { repo } = makeRepoAndMock({ Items: [toRawItem(entry)] });
      const found = await repo.findByOrderId('order-1');
      expect(found[0].reason).toBe('payment_declined');
    });
  });
});
