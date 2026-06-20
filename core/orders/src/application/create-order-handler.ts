import type { IdGeneratorPort, ClockPort } from '@tcs-challenge-for-backend/kernel';
import type { CreateOrderDto } from '@tcs-challenge-for-backend/contracts';
import { Money } from '../domain/money';
import { Order } from '../domain/order';
import { OrderId } from '../domain/order-id';
import type { OrderRepositoryPort, MessagePublisherPort } from './ports';
import type { RecordAuditEntryHandler } from './record-audit-entry-handler';

export class CreateOrderHandler {
  constructor(
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly orderRepo: OrderRepositoryPort,
    private readonly auditHandler: RecordAuditEntryHandler,
    private readonly publisher: MessagePublisherPort,
  ) {}

  async execute(dto: CreateOrderDto): Promise<string> {
    const id = OrderId.generate(this.idGen);
    const money = Money.create(dto.amount, dto.currency);
    const order = Order.create({ id, customerId: dto.customerId, money, clock: this.clock });

    await this.orderRepo.save(order);

    await this.auditHandler.execute({
      orderId: id.value,
      event: 'ORDER_CREATED',
      previousState: null,
      newState: 'PENDING',
      timestamp: order.createdAt,
    });

    await this.publisher.publishProcessOrder(id.value);

    return id.value;
  }
}
