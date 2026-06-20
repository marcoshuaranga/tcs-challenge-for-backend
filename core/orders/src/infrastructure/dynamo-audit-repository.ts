import { PutItemCommand, QueryCommand } from 'dynamodb-toolbox';
import type { AuditRepositoryPort } from '../application/ports';
import type { AuditEntry } from '../domain/audit-entry';
import type { AuditEntity } from './dynamo-entities';

export class DynamoAuditRepository implements AuditRepositoryPort {
  constructor(private readonly entity: AuditEntity) {}

  async append(entry: AuditEntry): Promise<void> {
    const uuid = crypto.randomUUID();
    const SK = `AUDIT#${entry.timestamp.toISOString()}#${uuid}`;
    await this.entity
      .build(PutItemCommand)
      .item({
        PK: `ORDER#${entry.orderId}`,
        SK,
        orderId: entry.orderId,
        event: entry.event,
        ...(entry.previousState != null ? { previousState: entry.previousState } : {}),
        newState: entry.newState,
        timestamp: entry.timestamp.toISOString(),
        ...(entry.reason != null ? { reason: entry.reason } : {}),
      })
      .send();
  }

  async findByOrderId(orderId: string): Promise<AuditEntry[]> {
    const { Items = [] } = await this.entity.table
      .build(QueryCommand)
      .query({ partition: `ORDER#${orderId}`, range: { beginsWith: 'AUDIT#' } })
      .entities(this.entity)
      .options({ maxPages: Infinity })
      .send();

    return Items.map((item) => ({
      orderId: item.orderId,
      event: item.event,
      previousState: item.previousState ?? null,
      newState: item.newState,
      timestamp: new Date(item.timestamp),
      ...(item.reason != null ? { reason: item.reason } : {}),
    }));
  }
}
