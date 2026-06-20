import { describe, expect, it } from 'vitest';
import { UuidGenerator } from '@tcs-challenge-for-backend/kernel';
import { OrderId } from '../../src/domain/order-id';

describe('OrderId', () => {
  it('generate() produces a non-empty string', () => {
    const id = OrderId.generate(new UuidGenerator());
    expect(id.value).toBeTruthy();
    expect(typeof id.value).toBe('string');
  });

  it('from() wraps an existing string', () => {
    const id = OrderId.from('abc-123');
    expect(id.value).toBe('abc-123');
  });
});
