# ADR-0011: AWS CDK for IaC

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

All-AWS, serverless, TypeScript-everywhere stack needs infrastructure as code.

## Decision

AWS CDK (TypeScript) as another pnpm workspace package (`apps/iac`).

## Options Considered

| Dimension                 | CDK (TS)                  | Terraform              |
| ------------------------- | ------------------------- | ---------------------- |
| Language parity           | Same TS everywhere        | HCL (extra language)   |
| AWS-serverless ergonomics | L2/L3 constructs, concise | Verbose for Lambda/SQS |
| Multi-cloud               | No                        | Yes (not needed)       |
| State management          | CFN-managed               | Separate backend       |

## Trade-off Analysis

Terraform's multi-cloud/provider strengths don't apply to an all-AWS serverless stack; CDK keeps
one language and concise constructs.

## Consequences

- Type-safe infra co-located with app code.

## Action Items

1. [ ] One `iac` CDK app; one stack.
