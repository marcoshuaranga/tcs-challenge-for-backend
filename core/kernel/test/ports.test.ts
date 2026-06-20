import { describe, expect, it } from 'vitest';
import { type ClockPort, type IdGeneratorPort, SystemClock, UuidGenerator } from '../src/ports';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('UuidGenerator', () => {
  it('satisfies IdGeneratorPort', () => {
    const gen: IdGeneratorPort = new UuidGenerator();
    expect(gen).toBeDefined();
  });

  it('generate() returns a UUID v4', () => {
    const id = new UuidGenerator().generate();
    expect(id).toMatch(UUID_V4_REGEX);
  });
});

describe('SystemClock', () => {
  it('satisfies ClockPort', () => {
    const clock: ClockPort = new SystemClock();
    expect(clock).toBeDefined();
  });

  it('now() returns a Date within 1000ms of Date.now()', () => {
    const before = Date.now();
    const result = new SystemClock().now();
    const after = Date.now();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after + 50);
  });
});
