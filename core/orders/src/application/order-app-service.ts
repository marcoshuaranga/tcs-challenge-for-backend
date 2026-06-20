import {
  ok,
  err,
  AppError,
  OrderNotFoundError,
  InvalidStateTransitionError,
} from '@tcs-challenge-for-backend/kernel';
import type { Result } from '@tcs-challenge-for-backend/kernel';
import type { CreateOrderDto } from '@tcs-challenge-for-backend/contracts';
import type { AuditEntry } from '../domain/audit-entry';
import type { Order } from '../domain/order';
import type { CreateOrderHandler } from './create-order-handler';
import type { GetOrderAuditHandler } from './get-order-audit-handler';
import type { GetOrderHandler } from './get-order-handler';
import type { ListOrdersHandler } from './list-orders-handler';
import type { ProcessOrderHandler } from './process-order-handler';
import type { OrderRepositoryPort } from './ports';

export class OrderAppService {
  constructor(
    private readonly createOrderHandler: CreateOrderHandler,
    private readonly processOrderHandler: ProcessOrderHandler,
    private readonly orderRepo: OrderRepositoryPort,
    private readonly listOrdersHandler: ListOrdersHandler,
    private readonly getOrderHandler: GetOrderHandler,
    private readonly getOrderAuditHandler: GetOrderAuditHandler,
  ) {}

  async registerOrder(dto: CreateOrderDto): Promise<Result<Order, AppError>> {
    try {
      const order = await this.createOrderHandler.execute(dto);
      return ok(order);
    } catch (e) {
      if (e instanceof AppError) return err(e);
      throw e;
    }
  }

  async processOrder(orderId: string): Promise<Result<void, AppError>> {
    try {
      const order = await this.orderRepo.findById(orderId);
      if (!order) throw new OrderNotFoundError(orderId);
      if (order.status !== 'PENDING')
        throw new InvalidStateTransitionError(order.status, 'PROCESSING');
      await this.processOrderHandler.execute(orderId);
      return ok(undefined);
    } catch (e) {
      if (e instanceof AppError) return err(e);
      throw e;
    }
  }

  async getOrder(orderId: string): Promise<Result<Order, AppError>> {
    try {
      const order = await this.getOrderHandler.execute({ orderId });
      return ok(order);
    } catch (e) {
      if (e instanceof AppError) return err(e);
      throw e;
    }
  }

  async getOrderAudit(orderId: string): Promise<Result<AuditEntry[], AppError>> {
    try {
      const entries = await this.getOrderAuditHandler.execute({ orderId });
      return ok(entries);
    } catch (e) {
      if (e instanceof AppError) return err(e);
      throw e;
    }
  }

  async listOrders(): Promise<Result<Order[], AppError>> {
    try {
      const orders = await this.listOrdersHandler.execute();
      return ok(orders);
    } catch (e) {
      if (e instanceof AppError) return err(e);
      throw e;
    }
  }
}
