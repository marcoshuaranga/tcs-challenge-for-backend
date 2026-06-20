import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SystemClock, UuidGenerator } from '@tcs-challenge-for-backend/kernel';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Money } from '../../src/domain/money';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { DynamoOrderRepository } from '../../src/infrastructure/dynamo-order-repository';

const DDB_ENDPOINT = process.env['DDB_ENDPOINT'];
const TABLE_NAME = `test-orders-${Date.now()}`;

function makeOrder() {
  const id = OrderId.generate(new UuidGenerator());
  const money = Money.create(100, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock: new SystemClock() });
}

async function clearTable(client: DynamoDBDocumentClient) {
  const { Items = [] } = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  if (Items.length === 0) return;
  for (let i = 0; i < Items.length; i += 25) {
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: Items.slice(i, i + 25).map((item) => ({
            DeleteRequest: { Key: { PK: item['PK'], SK: item['SK'] } },
          })),
        },
      }),
    );
  }
}

describe.skipIf(!DDB_ENDPOINT)('DynamoOrderRepository (integration)', () => {
  let documentClient: DynamoDBDocumentClient;
  let repo: DynamoOrderRepository;

  beforeAll(async () => {
    const client = new DynamoDBClient({ region: 'us-east-1', endpoint: DDB_ENDPOINT });
    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
    repo = new DynamoOrderRepository(documentClient, TABLE_NAME);
  });

  afterAll(async () => {
    const client = new DynamoDBClient({ region: 'us-east-1', endpoint: DDB_ENDPOINT });
    await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  });

  afterEach(async () => {
    await clearTable(documentClient);
  });

  it('findById returns null for unknown id', async () => {
    const result = await repo.findById('nonexistent-id');
    expect(result).toBeNull();
  });

  it('save then findById returns the order with all fields', async () => {
    const order = makeOrder();
    await repo.save(order);
    const found = await repo.findById(order.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(order.id);
    expect(found!.customerId).toBe(order.customerId);
    expect(found!.status).toBe('PENDING');
    expect(found!.money.amount).toBe(100);
    expect(found!.money.currency).toBe('USD');
  });

  it('second save with same id overwrites — findById returns updated values', async () => {
    const order = makeOrder();
    await repo.save(order);
    const processing = order.startProcessing(new SystemClock());
    await repo.save(processing);
    const found = await repo.findById(order.id);
    expect(found!.status).toBe('PROCESSING');
  });

  it('listAll returns all saved orders', async () => {
    const o1 = makeOrder();
    const o2 = makeOrder();
    await repo.save(o1);
    await repo.save(o2);
    const all = await repo.listAll();
    expect(all).toHaveLength(2);
    expect(all.map((o) => o.id)).toContain(o1.id);
    expect(all.map((o) => o.id)).toContain(o2.id);
  });

  it('listAll returns [] when table is empty', async () => {
    const all = await repo.listAll();
    expect(all).toEqual([]);
  });
});
