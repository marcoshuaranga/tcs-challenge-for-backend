import { Entity, item, string, number } from 'dynamodb-toolbox';
import type { createOrdersTable } from './dynamo-table';

type OrdersTable = ReturnType<typeof createOrdersTable>['table'];

export function createOrderEntity(table: OrdersTable) {
  return new Entity({
    name: 'Order',
    table,
    schema: item({
      PK: string().key(),
      SK: string().key(),
      GSI1PK: string(),
      GSI1SK: string(),
      id: string(),
      customerId: string(),
      amount: number(),
      currency: string(),
      status: string(),
      createdAt: string(),
      updatedAt: string(),
      failureReason: string().optional(),
    }),
    entityAttribute: false,
    timestamps: false,
  });
}

export function createAuditEntity(table: OrdersTable) {
  return new Entity({
    name: 'AuditEntry',
    table,
    schema: item({
      PK: string().key(),
      SK: string().key(),
      orderId: string(),
      event: string(),
      previousState: string().optional(),
      newState: string(),
      timestamp: string(),
      reason: string().optional(),
    }),
    entityAttribute: false,
    timestamps: false,
  });
}

export type OrderEntity = ReturnType<typeof createOrderEntity>;
export type AuditEntity = ReturnType<typeof createAuditEntity>;
