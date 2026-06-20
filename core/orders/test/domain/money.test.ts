import { describe, expect, it } from 'vitest';
import { Money } from '../../src/domain/money';
import { InvalidMoneyError } from '../../src/domain/errors';

describe('Money', () => {
  it('valid money is accepted', () => {
    const m = Money.create(100, 'USD');
    expect(m.amount).toBe(100);
    expect(m.currency).toBe('USD');
  });

  it('zero amount is rejected', () => {
    expect(() => Money.create(0, 'USD')).toThrow(InvalidMoneyError);
    try {
      Money.create(0, 'USD');
    } catch (e) {
      expect((e as InvalidMoneyError).code).toBe('INVALID_MONEY');
    }
  });

  it('negative amount is rejected', () => {
    expect(() => Money.create(-1, 'USD')).toThrow(InvalidMoneyError);
    try {
      Money.create(-1, 'USD');
    } catch (e) {
      expect((e as InvalidMoneyError).code).toBe('INVALID_MONEY');
    }
  });

  it('invalid currency is rejected', () => {
    expect(() => Money.create(100, 'us')).toThrow(InvalidMoneyError);
    try {
      Money.create(100, 'us');
    } catch (e) {
      expect((e as InvalidMoneyError).code).toBe('INVALID_MONEY');
    }
  });
});
