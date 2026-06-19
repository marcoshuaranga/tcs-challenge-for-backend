import { describe, expect, it } from 'vitest';
import { AppError, InvalidStateTransitionError, OrderNotFoundError } from './errors.ts';

describe('AppError', () => {
  it('is instanceof Error', () => {
    class ConcreteError extends AppError {
      code = 'CONCRETE';
    }
    const e = new ConcreteError('test message');
    expect(e).toBeInstanceOf(Error);
  });

  it('exposes code and message', () => {
    class ConcreteError extends AppError {
      code = 'CONCRETE';
    }
    const e = new ConcreteError('test message');
    expect(e.code).toBe('CONCRETE');
    expect(e.message).toBe('test message');
  });
});

describe('OrderNotFoundError', () => {
  it('has code ORDER_NOT_FOUND and message contains orderId', () => {
    const e = new OrderNotFoundError('abc-123');
    expect(e.code).toBe('ORDER_NOT_FOUND');
    expect(e.message).toContain('abc-123');
  });
});

describe('InvalidStateTransitionError', () => {
  it('has code INVALID_STATE_TRANSITION and message contains from and to', () => {
    const e = new InvalidStateTransitionError('COMPLETED', 'PENDING');
    expect(e.code).toBe('INVALID_STATE_TRANSITION');
    expect(e.message).toContain('COMPLETED');
    expect(e.message).toContain('PENDING');
  });
});
