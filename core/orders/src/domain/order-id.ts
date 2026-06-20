import type { IdGeneratorPort } from '@tcs-challenge-for-backend/kernel';

export class OrderId {
  private constructor(readonly value: string) {}

  static generate(idGen: IdGeneratorPort): OrderId {
    return new OrderId(idGen.generate());
  }

  static from(value: string): OrderId {
    return new OrderId(value);
  }
}
