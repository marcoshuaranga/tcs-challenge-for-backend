import {
  ok,
  err,
  AppError,
  OrderNotFoundError,
  InvalidStateTransitionError,
} from '@tcs-challenge-for-backend/kernel';
import type { Result } from '@tcs-challenge-for-backend/kernel';
import type { CreateOrderDto } from '@tcs-challenge-for-backend/contracts';
import type { CreateOrderHandler } from './create-order-handler';
import type { ProcessOrderHandler } from './process-order-handler';
import type { OrderRepositoryPort } from './ports';

export class OrderAppService {
  constructor(
    private readonly createOrderHandler: CreateOrderHandler,
    private readonly processOrderHandler: ProcessOrderHandler,
    private readonly orderRepo: OrderRepositoryPort,
  ) {}

  async registerOrder(dto: CreateOrderDto): Promise<Result<string, AppError>> {
    try {
      const orderId = await this.createOrderHandler.execute(dto);
      return ok(orderId);
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
}
