import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SystemClock, UuidGenerator } from '@tcs-challenge-for-backend/kernel';
import { describe, expect, it, vi } from 'vitest';
import { Money } from '../../src/domain/money';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import type { OrderItem } from '../../src/infrastructure/dynamo-entities';
import { DynamoOrderRepository } from '../../src/infrastructure/dynamo-order-repository';

const TABLE = 'orders-table';
const clock = new SystemClock();

function makeOrder() {
  const id = OrderId.generate(new UuidGenerator());
  return Order.create({ id, customerId: 'C1', money: Money.create(100, 'USD'), clock });
}

function makeClient(response: unknown = {}) {
  return { send: vi.fn().mockResolvedValue(response) } as unknown as DynamoDBDocumentClient;
}

function toItem(order: Order): OrderItem {
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

function sentCmd(client: DynamoDBDocumentClient) {
  return (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe('DynamoOrderRepository', () => {
  describe('findById', () => {
    it('sends GetCommand with PK=ORDER#<id> and SK=METADATA', async () => {
      const client = makeClient({});
      await new DynamoOrderRepository(client, TABLE).findById('abc');
      const cmd = sentCmd(client);
      expect(cmd).toBeInstanceOf(GetCommand);
      expect(cmd.input).toEqual({ TableName: TABLE, Key: { PK: 'ORDER#abc', SK: 'METADATA' } });
    });

    it('returns null when Item is absent', async () => {
      const result = await new DynamoOrderRepository(makeClient({}), TABLE).findById('x');
      expect(result).toBeNull();
    });

    it('maps Item fields to Order correctly', async () => {
      const order = makeOrder();
      const client = makeClient({ Item: toItem(order) });
      const found = await new DynamoOrderRepository(client, TABLE).findById(order.id);
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
      const item = { ...toItem(failed), failureReason: 'payment_declined' };
      const found = await new DynamoOrderRepository(makeClient({ Item: item }), TABLE).findById(
        failed.id,
      );
      expect(found!.failureReason).toBe('payment_declined');
    });
  });

  describe('save', () => {
    it('sends PutCommand with correctly shaped item', async () => {
      const order = makeOrder();
      const client = makeClient({});
      await new DynamoOrderRepository(client, TABLE).save(order);
      const cmd = sentCmd(client);
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
      const client = makeClient({});
      await new DynamoOrderRepository(client, TABLE).save(makeOrder());
      expect(sentCmd(client).input.Item.failureReason).toBeUndefined();
    });

    it('includes failureReason when order is FAILED', async () => {
      const failed = makeOrder().startProcessing(clock).fail('payment_declined', clock);
      const client = makeClient({});
      await new DynamoOrderRepository(client, TABLE).save(failed);
      const item = sentCmd(client).input.Item;
      expect(item.status).toBe('FAILED');
      expect(item.failureReason).toBe('payment_declined');
    });
  });

  describe('listAll', () => {
    it('sends QueryCommand on GSI1 with ORDERS partition key', async () => {
      const client = makeClient({ Items: [] });
      await new DynamoOrderRepository(client, TABLE).listAll();
      const cmd = sentCmd(client);
      expect(cmd).toBeInstanceOf(QueryCommand);
      expect(cmd.input.IndexName).toBe('GSI1');
      expect(cmd.input.ExpressionAttributeValues[':pk']).toBe('ORDERS');
    });

    it('returns empty array when Items is empty', async () => {
      const result = await new DynamoOrderRepository(makeClient({ Items: [] }), TABLE).listAll();
      expect(result).toEqual([]);
    });

    it('maps all Items to Orders', async () => {
      const o1 = makeOrder();
      const o2 = makeOrder();
      const client = makeClient({ Items: [toItem(o1), toItem(o2)] });
      const all = await new DynamoOrderRepository(client, TABLE).listAll();
      expect(all).toHaveLength(2);
      expect(all.map((o) => o.id)).toContain(o1.id);
      expect(all.map((o) => o.id)).toContain(o2.id);
    });
  });
});
