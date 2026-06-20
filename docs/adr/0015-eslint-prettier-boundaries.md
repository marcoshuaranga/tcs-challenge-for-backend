# ADR-0015: ESLint + Prettier for code style

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

We need a formatter + linter across the pnpm workspaces monorepo. Two concerns are distinct:

1. **Code style** (formatting + general lint rules) — applies to all files.
2. **Architecture boundary enforcement** — hexagonal layer ordering (`domain` ← `application` ←
   `infrastructure`). At this project's scale this is enforced by code discipline and review.

## Decision

**Prettier owns formatting. ESLint (via `typescript-eslint`) owns lint rules.**

- Root `.prettierrc` with shared format rules; `.prettierignore` for generated output.
- `eslint.config.mjs` uses `typescript-eslint` flat config (`tseslint.configs.recommended`).
- No Biome.

## Options Considered

| Dimension               | ESLint + Prettier (chosen)   | Biome only                         |
| ----------------------- | ---------------------------- | ---------------------------------- |
| Familiarity / ecosystem | Universal, well-known        | Newer, smaller ecosystem           |
| TypeScript rules        | `typescript-eslint` — mature | Built-in, less configurable        |
| Toolchain count         | 2 (ESLint + Prettier)        | 1                                  |
| Risk                    | None                         | Less community precedent for rules |

## Trade-off Analysis

ESLint + Prettier is the standard TypeScript toolchain. Biome would be faster but is less
established for TypeScript-specific rules. Speed difference is irrelevant at this project's scale.

## Reference configuration

Root `.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

`eslint.config.mjs`:

```js
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/dist', '**/node_modules', '**/cdk.out', '**/coverage'] },
  ...tseslint.configs.recommended,
];
```

Commands:

```
pnpm dlx prettier --write .   # format all files
pnpm dlx prettier --check .   # CI formatting check
pnpm dlx eslint .             # lint workspace
```

## Consequences

- Single lint entry point covers TypeScript best practices across all packages.
- Prettier formatting is consistent workspace-wide.
- Do not use Biome; do not add `biome.json`.

## Action Items

1. [x] Add root `.prettierrc`; add `.prettierignore` (dist, cdk.out, node_modules).
2. [x] Add `eslint.config.mjs` with `typescript-eslint` recommended config.
3. [x] Install devDeps: `typescript-eslint`, `prettier`, `eslint`.
