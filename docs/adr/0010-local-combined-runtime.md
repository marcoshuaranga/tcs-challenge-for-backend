# ADR-0010: Local in-memory transport ⇒ combined local runtime

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Decision: SQS in infra, in-memory for local. An in-memory queue only works within one process;
separate API and worker processes cannot share it.

## Decision

Locally, run a combined runtime: a single process hosting the Hono server and the worker
poll-loop, sharing one in-memory queue instance. In AWS they split into two Lambdas over SQS —
same core, different driving adapters.

## Options Considered

- **Combined local process (chosen)** — honors "memory for local" with zero extra infra.
- **ElasticMQ (SQS-compatible) in Docker** — true two-process parity, but adds a broker.
- **Local SQS via LocalStack** — highest fidelity, heaviest to run.

## Trade-off Analysis

Combined process trades local≠prod topology for zero local infra; the hexagonal adapters make
the prod split a swap, not a rewrite.

## Consequences

- Local dev needs no broker.
- Local process topology differs from AWS (documented).

## Action Items

1. [ ] `local` composition root wiring both adapters in one process. ElasticMQ noted as an option.
