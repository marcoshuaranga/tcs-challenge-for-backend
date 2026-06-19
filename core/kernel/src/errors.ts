export abstract class AppError extends Error {
  abstract readonly code: string;
}

export class OrderNotFoundError extends AppError {
  readonly code = 'ORDER_NOT_FOUND';

  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
  }
}

export class InvalidStateTransitionError extends AppError {
  readonly code = 'INVALID_STATE_TRANSITION';

  constructor(from: string, to: string) {
    super(`Invalid state transition from ${from} to ${to}`);
  }
}
