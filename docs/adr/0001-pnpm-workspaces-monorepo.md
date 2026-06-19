# ADR-0001: pnpm workspaces monorepo

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Several deployables (API, worker, IaC, docs, web) share contracts and core logic.
All packages are bundled at build time (esbuild → Lambda zip); nothing is published to a registry.

## Decision

Single monorepo with `apps/*` and `core/*` managed by **pnpm workspaces**.
TypeScript path aliases in `tsconfig.base.json` handle cross-package resolution in dev.
Hexagonal layer ordering within `core/orders` is enforced by code discipline and review.

## Options Considered

| Dimension                      | pnpm workspaces (chosen)            | Polyrepo             |
| ------------------------------ | ----------------------------------- | -------------------- |
| Code sharing (contracts, core) | Trivial via workspace:\*            | Painful (publishing) |
| Boundary enforcement           | Code review + ESLint                | Manual               |
| Setup cost                     | Low                                 | Low                  |
| Commit-history legibility      | High (atomic cross-cutting commits) | Fragmented           |

## Trade-off Analysis

pnpm workspaces gives shared `node_modules`, workspace-protocol linking, and atomic commits
with zero tooling overhead. Build orchestration per package uses `pnpm --filter` or `pnpm -r`.
Since the project is bundle-at-build-time and has no CI, incremental build caching (NX, Turborepo)
adds weight without proportional benefit at this scale.

## Consequences

- One `pnpm install`; workspace packages link via `workspace:*`.
- `pnpm --filter <pkg> <script>` runs targets per package.
- NX or Turborepo could be added later as a "posible mejora" if the project grows to multiple
  teams or requires fine-grained CI caching.
