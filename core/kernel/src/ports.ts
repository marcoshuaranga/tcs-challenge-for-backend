export interface IdGeneratorPort {
  generate(): string;
}

export interface ClockPort {
  now(): Date;
}

export class UuidGenerator implements IdGeneratorPort {
  generate(): string {
    return crypto.randomUUID();
  }
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
