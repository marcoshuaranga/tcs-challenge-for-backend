import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { OrderRepositoryPort } from '../application/ports';
import { Money } from '../domain/money';
import { Order } from '../domain/order';
import type { OrderStatus } from '../domain/order';
import type { OrderItem } from './dynamo-entities';

export class DynamoOrderRepository implements OrderRepositoryPort {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `ORDER#${id}`, SK: 'METADATA' },
      }),
    );
    if (!result.Item) return null;
    return this.itemToOrder(result.Item as OrderItem);
  }

  async save(order: Order): Promise<void> {
    const item: OrderItem = {
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
    if (order.failureReason != null) item.failureReason = order.failureReason;
    await this.documentClient.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  async listAll(): Promise<Order[]> {
    const result = await this.documentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ORDERS' },
      }),
    );
    return (result.Items ?? []).map((item) => this.itemToOrder(item as OrderItem));
  }

  private itemToOrder(item: OrderItem): Order {
    return Object.assign(Object.create(Order.prototype), {
      id: item.id,
      customerId: item.customerId,
      money: Money.create(item.amount, item.currency),
      status: item.status as OrderStatus,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      ...(item.failureReason != null ? { failureReason: item.failureReason } : {}),
    }) as Order;
  }
}
