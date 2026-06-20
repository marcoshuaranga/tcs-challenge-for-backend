import { Entity, schema, string, number } from 'dynamodb-toolbox';
import type { OrderStatus } from '../domain/order';
import type { createOrdersTable } from './dynamo-table';

type OrdersTable = ReturnType<typeof createOrdersTable>['table'];

export function createOrderEntity(table: OrdersTable) {
  return new Entity({
    name: 'Order',
    table,
    schema: schema({
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
    timestamps: false,
  });
}

export function createAuditEntity(table: OrdersTable) {
  return new Entity({
    name: 'AuditEntry',
    table,
    schema: schema({
      PK: string().key(),
      SK: string().key(),
      orderId: string(),
      event: string(),
      previousState: string().optional(),
      newState: string(),
      timestamp: string(),
      reason: string().optional(),
    }),
    timestamps: false,
  });
}

/** DynamoDB item shape for an Order — PK=ORDER#<id>, SK=METADATA */
export type OrderItem = {
  PK: string;
  SK: 'METADATA';
  GSI1PK: 'ORDERS';
  /** <createdAt.toISOString()>#<id> keeps GSI1 sort keys unique */
  GSI1SK: string;
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
};

/** DynamoDB item shape for an AuditEntry — PK=ORDER#<orderId>, SK=AUDIT#<timestamp>#<uuid> */
export type AuditItem = {
  PK: string;
  SK: string;
  orderId: string;
  event: string;
  previousState: string | null;
  newState: string;
  timestamp: string;
  reason?: string;
};
