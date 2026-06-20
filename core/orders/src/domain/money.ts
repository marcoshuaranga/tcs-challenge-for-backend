import { InvalidMoneyError } from './errors';

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (amount <= 0) {
      throw new InvalidMoneyError(`Amount must be positive, got ${amount}`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidMoneyError(`Invalid currency: ${currency}`);
    }
    return new Money(amount, currency);
  }
}
