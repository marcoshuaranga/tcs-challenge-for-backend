## 1. core/contracts — zod-to-openapi annotations

- [x] 1.1 Add `@asteasolutions/zod-to-openapi` to `core/contracts/package.json`;
      run `pnpm install`
- [x] 1.2 Call `extendZodWithOpenApi(z)` at the top of `core/contracts/src/index.ts`
      (must run before any schema is defined)
- [x] 1.3 Add `.openapi({ ref: '...' })` metadata to `OrderCreateSchema`,
      `OrderResponseSchema`, and error envelope schemas
- [x] 1.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/contracts`
- [x] 1.5 Commit: `feat(contracts): annotate Zod schemas with zod-to-openapi metadata`

## 2. apps/api-docs — setup + implementation

- [x] 2.1 Create `apps/api-docs/package.json` with name
      `@tcs-challenge-for-backend/api-docs`; add `hono`, `@hono/node-server`,
      `@scalar/hono-api-reference`, `@asteasolutions/zod-to-openapi`, and
      `@tcs-challenge-for-backend/contracts` as workspace dep
- [x] 2.2 Create `apps/api-docs/tsconfig.json` extending `../../tsconfig.node.json`
- [x] 2.3 Add `apps/api-docs` to `pnpm-workspace.yaml`; run `pnpm install`
- [x] 2.4 Implement `apps/api-docs/src/app.ts`: build OpenAPI document from
      `core/contracts` schemas using `OpenAPIRegistry` + `OpenAPIGenerator`;
      mount `GET /openapi.json` and Scalar UI `GET /` via Hono
- [x] 2.5 Create `apps/api-docs/src/index.ts`: start server with `@hono/node-server`
      on `PORT` (default 3001)
- [x] 2.6 Verify dev server: `GET /openapi.json` returns valid JSON;
      `GET /` renders Scalar UI in browser
- [x] 2.7 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/api-docs`
- [x] 2.8 Commit: `feat(api-docs): OpenAPI spec + Scalar UI`

## 3. apps/web — setup

- [x] 3.1 Create `apps/web/package.json` with `astro`, `@astrojs/tailwind`,
      `tailwindcss`, `daisyui`; name `@tcs-challenge-for-backend/web`
- [x] 3.2 Configure `astro.config.mjs`: `output: 'static'`, Tailwind integration
- [x] 3.3 Configure `tailwind.config.mjs`: add DaisyUI plugin
- [x] 3.4 Add `apps/web` to `pnpm-workspace.yaml`; run `pnpm install`
- [x] 3.5 Add `PUBLIC_API_URL`, `PUBLIC_API_DOCS_URL`, and `DEMO_JWT` to `.env.example`

## 4. apps/web — Landing page

- [x] 4.1 Implement `apps/web/src/pages/index.astro`: title, brief description,
      DaisyUI card links to `/customer`, `/backoffice`, and `PUBLIC_API_DOCS_URL`
- [x] 4.2 Verify dev server shows landing page with all three links
- [x] 4.3 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/web`
- [ ] 4.4 Commit: `feat(web): Landing page`

## 5. apps/web — Customer page

- [ ] 5.1 Implement `apps/web/src/pages/customer.astro`:
      — DaisyUI form (`customerId`, `amount`, `currency`); on submit calls
      `POST /orders` with `Authorization: Bearer <DEMO_JWT>`; displays
      returned `id` and `status` or error message;
      — DaisyUI input for order id; on submit calls `GET /orders/:id`; displays
      order fields or "Order not found"
- [ ] 5.2 Verify dev server: create form and status lookup work end-to-end
- [ ] 5.3 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/web`
- [ ] 5.4 Commit: `feat(web): Customer page — create order + status lookup`

## 6. apps/web — Backoffice page

- [ ] 6.1 Implement `apps/web/src/pages/backoffice.astro`: on load calls
      `GET /orders` with `Authorization: Bearer <DEMO_JWT>`; renders DaisyUI
      table (`id`, `status`, `customerId`, `amount`, `currency`, `createdAt`);
      empty-state message when `[]`; error message on non-2xx
- [ ] 6.2 Verify dev server: table populates when orders exist; empty-state shown
      when none
- [ ] 6.3 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/web`
- [ ] 6.4 Commit: `feat(web): Backoffice page — orders table`

## 7. Quality gate

- [ ] 7.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [ ] 7.2 Archive this change with `/opsx:archive`
