# ADR-0006: SQS + DLQ for asynchronous processing

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Order processing must be decoupled and resilient; there is one logical consumer (the worker).

## Decision

SQS standard queue for the work path, with a dead-letter queue after `maxReceiveCount`. The
worker is the consumer.

## Options Considered

| Dimension                    | SQS                              | SNS                    | EventBridge                         |
| ---------------------------- | -------------------------------- | ---------------------- | ----------------------------------- |
| Pattern                      | Work queue (pull, buffer, retry) | Pub/sub fan-out        | Event bus (routing, schema, replay) |
| Buffering / backpressure     | Yes                              | No                     | Limited                             |
| DLQ / retries                | Native                           | Via SQS subscription   | Via target DLQ                      |
| Fit for "process this order" | Best                             | Poor (single consumer) | Overkill now                        |

## Trade-off Analysis

With a single consumer and audit handled explicitly in code (ADR-0009), there is no fan-out to
justify SNS or EventBridge today.

## Consequences

- At-least-once delivery ⇒ idempotent consumer required.
- Visibility timeout must exceed processing time.
- Evolution: EventBridge (preferred over SNS for app events) when `OrderStatusChanged` needs
  multiple subscribers.

## Action Items

1. [ ] Queue + DLQ in CDK; alarm on DLQ depth.
