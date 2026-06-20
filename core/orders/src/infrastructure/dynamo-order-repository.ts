import { GetItemCommand, PutItemCommand, QueryCommand } from 'dynamodb-toolbox';
import type { FormattedItem } from 'dynamodb-toolbox';
import type { OrderRepositoryPort } from '../application/ports';
import { Money } from '../domain/money';
import { Order } from '../domain/order';
import type { OrderStatus } from '../domain/order';
import type { OrderEntity } from './dynamo-entities';

type OrderItem = FormattedItem<OrderEntity>;

const MAX_QUERY_PAGES = 100;

export class DynamoOrderRepository implements OrderRepositoryPort {
  constructor(private readonly entity: OrderEntity) {}

  async findById(id: string): Promise<Order | null> {
    const { Item } = await this.entity
      .build(GetItemCommand)
      .key({ PK: `ORDER#${id}`, SK: 'METADATA' })
      .send();
    return Item ? this.itemToOrder(Item) : null;
  }

  async save(order: Order): Promise<void> {
    await this.entity
      .build(PutItemCommand)
      .item({
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
        ...(order.failureReason != null ? { failureReason: order.failureReason } : {}),
      })
      .send();
  }

  async listAll(): Promise<Order[]> {
    const { Items = [] } = await this.entity.table
      .build(QueryCommand)
      .query({ index: 'GSI1', partition: 'ORDERS' })
      .entities(this.entity)
      .options({ maxPages: MAX_QUERY_PAGES })
      .send();
    return Items.map((item) => this.itemToOrder(item as NonNullable<OrderItem>));
  }

  private itemToOrder(item: NonNullable<OrderItem>): Order {
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
