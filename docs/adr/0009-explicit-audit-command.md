# ADR-0009: Explicit audit via command (not DynamoDB Streams)

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Every state change must produce an audit event; the author wants everything visible and testable.

## Decision

Each transition handler explicitly dispatches `RecordAuditEntryCommand`, which writes through
`AuditRepositoryPort`. No Streams, no implicit listeners.

## Options Considered

| Dimension          | Explicit command | DynamoDB Streams → Lambda |
| ------------------ | ---------------- | ------------------------- |
| Visibility in code | Full             | Hidden in infra           |
| Testability        | Unit-testable    | Integration only          |
| Coupling to AWS    | None             | Tight                     |
| Operational pieces | Zero extra       | Stream + Lambda           |

## Trade-off Analysis

Explicit writes keep audit part of the same logical, testable flow; Streams would be lower-touch
at runtime but invisible and AWS-coupled.

## Consequences

- Audit asserted in unit tests on create + every transition.

## Action Items

1. [ ] `AuditEntry` model; `RecordAuditEntryHandler`; call on create + each transition.
