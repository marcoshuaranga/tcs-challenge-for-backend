import { describe, expect, it } from 'vitest';
import { err, ok } from './result.ts';

describe('Result', () => {
  it('ok(value) returns { ok: true, value }', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('err(error) returns { ok: false, error }', () => {
    const result = err('something went wrong');
    expect(result).toEqual({ ok: false, error: 'something went wrong' });
  });

  it('TypeScript narrows value/error when branching on result.ok', () => {
    const result: ReturnType<typeof ok<number>> | ReturnType<typeof err<string>> = ok(99);

    if (result.ok) {
      // TypeScript should narrow result.value to number here
      const val: number = result.value;
      expect(val).toBe(99);
    } else {
      // TypeScript should narrow result.error to string here
      const e: string = result.error;
      expect(e).toBe('never reached');
    }
  });
});
