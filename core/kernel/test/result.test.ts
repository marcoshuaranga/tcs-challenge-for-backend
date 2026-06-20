import { describe, expect, it } from 'vitest';
import { type Result, err, ok } from '../src/result';

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
    function process(result: Result<number, string>): number | string {
      if (result.ok) {
        const val: number = result.value;
        return val;
      } else {
        const e: string = result.error;
        return e;
      }
    }
    expect(process(ok(99))).toBe(99);
    expect(process(err('fail'))).toBe('fail');
  });
});
