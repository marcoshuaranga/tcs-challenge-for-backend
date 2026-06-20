import { OrderNotFoundError, InvalidStateTransitionError } from '@tcs-challenge-for-backend/kernel';
import type { ClockPort } from '@tcs-challenge-for-backend/kernel';
import type { Order } from '../domain/order';
import type { OrderRepositoryPort, PaymentGatewayPort } from './ports';
import type { RecordAuditEntryHandler } from './record-audit-entry-handler';

export class ProcessOrderHandler {
  constructor(
    private readonly clock: ClockPort,
    private readonly orderRepo: OrderRepositoryPort,
    private readonly auditHandler: RecordAuditEntryHandler,
    private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);

    if (order.status !== 'PENDING') throw new InvalidStateTransitionError(order.status, 'PROCESSING');

    const processing = order.startProcessing(this.clock);
    await this.orderRepo.save(processing);
    await this.auditHandler.execute({
      orderId,
      event: 'ORDER_PROCESSING_STARTED',
      previousState: 'PENDING',
      newState: 'PROCESSING',
      timestamp: processing.updatedAt,
    });

    const { approved } = await this.gateway.authorize(processing);

    if (approved) {
      const completed = processing.complete(this.clock);
      await this.orderRepo.save(completed);
      await this.auditHandler.execute({
        orderId,
        event: 'ORDER_COMPLETED',
        previousState: 'PROCESSING',
        newState: 'COMPLETED',
        timestamp: completed.updatedAt,
      });
      return completed;
    } else {
      const failed = processing.fail('payment_declined', this.clock);
      await this.orderRepo.save(failed);
      await this.auditHandler.execute({
        orderId,
        event: 'ORDER_FAILED',
        previousState: 'PROCESSING',
        newState: 'FAILED',
        timestamp: failed.updatedAt,
        reason: failed.failureReason,
      });
      return failed;
    }
  }
}
