import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { AuditEntry } from '../../src/domain/audit-entry';
import { DynamoAuditRepository } from '../../src/infrastructure/dynamo-audit-repository';

const DDB_ENDPOINT = process.env['DDB_ENDPOINT'];
const TABLE_NAME = `test-audit-${Date.now()}`;

function makeEntry(orderId: string, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    orderId,
    event: 'ORDER_CREATED',
    previousState: null,
    newState: 'PENDING',
    timestamp: new Date(),
    ...overrides,
  };
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

describe.skipIf(!DDB_ENDPOINT)('DynamoAuditRepository (integration)', () => {
  let documentClient: DynamoDBDocumentClient;
  let repo: DynamoAuditRepository;

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
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
    repo = new DynamoAuditRepository(documentClient, TABLE_NAME);
  });

  afterAll(async () => {
    const client = new DynamoDBClient({ region: 'us-east-1', endpoint: DDB_ENDPOINT });
    await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  });

  afterEach(async () => {
    await clearTable(documentClient);
  });

  it('append then findByOrderId returns the entry', async () => {
    const entry = makeEntry('order-1');
    await repo.append(entry);
    const found = await repo.findByOrderId('order-1');
    expect(found).toHaveLength(1);
    expect(found[0].orderId).toBe('order-1');
    expect(found[0].event).toBe('ORDER_CREATED');
    expect(found[0].newState).toBe('PENDING');
    expect(found[0].previousState).toBeNull();
  });

  it('two appends for same order with same timestamp do not collide', async () => {
    const timestamp = new Date('2024-01-01T10:00:00Z');
    await repo.append(makeEntry('order-2', { timestamp }));
    await repo.append(
      makeEntry('order-2', {
        timestamp,
        event: 'ORDER_PROCESSING',
        newState: 'PROCESSING',
        previousState: 'PENDING',
      }),
    );
    const found = await repo.findByOrderId('order-2');
    expect(found).toHaveLength(2);
  });

  it('findByOrderId returns entries in ascending timestamp order', async () => {
    const t1 = new Date('2024-01-01T10:00:00Z');
    const t2 = new Date('2024-01-01T11:00:00Z');
    await repo.append(makeEntry('order-3', { timestamp: t1, event: 'CREATED' }));
    await repo.append(
      makeEntry('order-3', {
        timestamp: t2,
        event: 'PROCESSING',
        newState: 'PROCESSING',
        previousState: 'PENDING',
      }),
    );
    const found = await repo.findByOrderId('order-3');
    expect(found).toHaveLength(2);
    expect(found[0].timestamp.getTime()).toBeLessThanOrEqual(found[1].timestamp.getTime());
  });

  it('findByOrderId returns [] for an orderId with no entries', async () => {
    const found = await repo.findByOrderId('order-with-no-audit');
    expect(found).toEqual([]);
  });
});
