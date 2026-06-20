import { ok, err } from '@tcs-challenge-for-backend/kernel';
import type { Result, AppError } from '@tcs-challenge-for-backend/kernel';
import type { CreateOrderDto } from '@tcs-challenge-for-backend/contracts';
import type { CreateOrderHandler } from './create-order-handler';

export class OrderAppService {
  constructor(private readonly createOrderHandler: CreateOrderHandler) {}

  async registerOrder(dto: CreateOrderDto): Promise<Result<string, AppError>> {
    try {
      const orderId = await this.createOrderHandler.execute(dto);
      return ok(orderId);
    } catch (e) {
      if (e instanceof Error && 'code' in e) {
        return err(e as AppError);
      }
      throw e;
    }
  }
}
