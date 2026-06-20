export type AuditEntry = {
  orderId: string;
  event: string;
  previousState: string | null;
  newState: string;
  timestamp: Date;
  reason?: string;
};
