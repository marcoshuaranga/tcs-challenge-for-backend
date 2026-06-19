# ADR-0005: DynamoDB + dynamodb-toolbox, single-table design

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Serverless target; orders + audit trail; need a "list all orders" view for the backoffice.

## Decision

One DynamoDB table, two entities (`Order`, `AuditEntry`), modeled with dynamodb-toolbox.

Access patterns:

| Pattern                 | Operation  | Keys                                           |
| ----------------------- | ---------- | ---------------------------------------------- |
| Get order by id         | GetItem    | `PK = ORDER#<id>`, `SK = #META`                |
| Get order + audit trail | Query      | `PK = ORDER#<id>` (SK `begins_with AUDIT#`)    |
| List all orders         | Query GSI1 | `GSI1PK = ORDERS`, `GSI1SK = <createdAt>#<id>` |

## Options Considered

| Dimension            | DynamoDB               | PostgreSQL/RDS                     |
| -------------------- | ---------------------- | ---------------------------------- |
| Serverless fit       | Native, scales to zero | Needs instance / Aurora Serverless |
| Ops burden           | Minimal (on-demand)    | Patching, capacity                 |
| "List all"           | GSI with constant PK   | Trivial SELECT                     |
| Modeling skill shown | Access-pattern design  | Schema/normalization               |

## Trade-off Analysis

DynamoDB's weak spot is the unbounded "list all"; the GSI1 constant-partition pattern solves it
without a scan. Acceptable at challenge scale (hot-partition caveat noted in design §9).

## Consequences

- Access patterns must be designed up front.

## Action Items

1. [ ] Define Table + entities; provision GSI1.
