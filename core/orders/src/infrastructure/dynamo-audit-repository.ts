import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AuditRepositoryPort } from '../application/ports';
import type { AuditEntry } from '../domain/audit-entry';
import type { AuditItem } from './dynamo-entities';

export class DynamoAuditRepository implements AuditRepositoryPort {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async append(entry: AuditEntry): Promise<void> {
    const uuid = crypto.randomUUID();
    const SK = `AUDIT#${entry.timestamp.toISOString()}#${uuid}`;
    const item: AuditItem = {
      PK: `ORDER#${entry.orderId}`,
      SK,
      orderId: entry.orderId,
      event: entry.event,
      previousState: entry.previousState,
      newState: entry.newState,
      timestamp: entry.timestamp.toISOString(),
    };
    if (entry.reason != null) item.reason = entry.reason;
    await this.documentClient.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  async findByOrderId(orderId: string): Promise<AuditEntry[]> {
    const result = await this.documentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `ORDER#${orderId}`, ':prefix': 'AUDIT#' },
        ScanIndexForward: true,
      }),
    );
    return (result.Items ?? []).map((item) => this.itemToAuditEntry(item as AuditItem));
  }

  private itemToAuditEntry(item: AuditItem): AuditEntry {
    return {
      orderId: item.orderId,
      event: item.event,
      previousState: item.previousState,
      newState: item.newState,
      timestamp: new Date(item.timestamp),
      ...(item.reason != null ? { reason: item.reason } : {}),
    };
  }
}
