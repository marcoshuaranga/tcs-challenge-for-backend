import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SystemClock, UuidGenerator } from '@tcs-challenge-for-backend/kernel';
import { Table } from 'dynamodb-toolbox';
import { describe, expect, it, vi } from 'vitest';
import { Money } from '../../src/domain/money';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { createOrderEntity } from '../../src/infrastructure/dynamo-entities';
import { DynamoOrderRepository } from '../../src/infrastructure/dynamo-order-repository';

const TABLE = 'orders-table';
const clock = new SystemClock();

function makeOrder() {
  const id = OrderId.generate(new UuidGenerator());
  return Order.create({ id, customerId: 'C1', money: Money.create(100, 'USD'), clock });
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
  const entity = createOrderEntity(table);
  const repo = new DynamoOrderRepository(entity);
  return { repo, mockSend };
}

function toRawItem(order: Order) {
  return {
    PK: `ORDER#${order.id}`,
    SK: 'METADATA',
    GSI1PK: 'ORDERS',
    GSI1SK: `${order.createdAt.toISOString()}#${order.id}`,
    id: order.id,
    customerId: order.customerId,
    amount: order.money.amount,
    currency: order.money.currency,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function sentCmd(mockSend: ReturnType<typeof vi.fn>) {
  return mockSend.mock.calls[0][0];
}

describe('DynamoOrderRepository', () => {
  describe('findById', () => {
    it('sends GetCommand with PK=ORDER#<id> and SK=METADATA', async () => {
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.findById('abc');
      const cmd = sentCmd(mockSend);
      expect(cmd).toBeInstanceOf(GetCommand);
      expect(cmd.input).toEqual({ TableName: TABLE, Key: { PK: 'ORDER#abc', SK: 'METADATA' } });
    });

    it('returns null when Item is absent', async () => {
      const { repo } = makeRepoAndMock({});
      const result = await repo.findById('x');
      expect(result).toBeNull();
    });

    it('maps Item fields to Order correctly', async () => {
      const order = makeOrder();
      const { repo } = makeRepoAndMock({ Item: toRawItem(order) });
      const found = await repo.findById(order.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(order.id);
      expect(found!.customerId).toBe('C1');
      expect(found!.status).toBe('PENDING');
      expect(found!.money.amount).toBe(100);
      expect(found!.money.currency).toBe('USD');
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('maps failureReason when present', async () => {
      const failed = makeOrder().startProcessing(clock).fail('payment_declined', clock);
      const item = { ...toRawItem(failed), failureReason: 'payment_declined' };
      const { repo } = makeRepoAndMock({ Item: item });
      const found = await repo.findById(failed.id);
      expect(found!.failureReason).toBe('payment_declined');
    });
  });

  describe('save', () => {
    it('sends PutCommand with correctly shaped item', async () => {
      const order = makeOrder();
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.save(order);
      const cmd = sentCmd(mockSend);
      expect(cmd).toBeInstanceOf(PutCommand);
      const item = cmd.input.Item;
      expect(item.PK).toBe(`ORDER#${order.id}`);
      expect(item.SK).toBe('METADATA');
      expect(item.GSI1PK).toBe('ORDERS');
      expect(item.GSI1SK).toBe(`${order.createdAt.toISOString()}#${order.id}`);
      expect(item.id).toBe(order.id);
      expect(item.customerId).toBe('C1');
      expect(item.amount).toBe(100);
      expect(item.currency).toBe('USD');
      expect(item.status).toBe('PENDING');
    });

    it('omits failureReason for non-FAILED orders', async () => {
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.save(makeOrder());
      expect(sentCmd(mockSend).input.Item.failureReason).toBeUndefined();
    });

    it('includes failureReason when order is FAILED', async () => {
      const failed = makeOrder().startProcessing(clock).fail('payment_declined', clock);
      const { repo, mockSend } = makeRepoAndMock({});
      await repo.save(failed);
      const item = sentCmd(mockSend).input.Item;
      expect(item.status).toBe('FAILED');
      expect(item.failureReason).toBe('payment_declined');
    });
  });

  describe('listAll', () => {
    it('sends QueryCommand on GSI1 with ORDERS partition key', async () => {
      const { repo, mockSend } = makeRepoAndMock({ Items: [] });
      await repo.listAll();
      const cmd = sentCmd(mockSend);
      expect(cmd).toBeInstanceOf(QueryCommand);
      expect(cmd.input.IndexName).toBe('GSI1');
      expect(Object.values(cmd.input.ExpressionAttributeValues)).toContain('ORDERS');
    });

    it('returns empty array when Items is empty', async () => {
      const { repo } = makeRepoAndMock({ Items: [] });
      const result = await repo.listAll();
      expect(result).toEqual([]);
    });

    it('maps all Items to Orders', async () => {
      const o1 = makeOrder();
      const o2 = makeOrder();
      const { repo } = makeRepoAndMock({ Items: [toRawItem(o1), toRawItem(o2)] });
      const all = await repo.listAll();
      expect(all).toHaveLength(2);
      expect(all.map((o) => o.id)).toContain(o1.id);
      expect(all.map((o) => o.id)).toContain(o2.id);
    });
  });
});
