import { AppError } from '@tcs-challenge-for-backend/kernel';

export class InvalidMoneyError extends AppError {
  readonly code = 'INVALID_MONEY';
  constructor(message: string) {
    super(message);
  }
}
