---
title: React Contributor Playbook
description: Required layering, testing, and verification rules for React changes.
---

# React Contributor Playbook

This project uses strict React layering to prevent race regressions and architecture drift.

## Required shapes

### Components

- `src/react/components/**` should be thin wrappers.
- Wrapper files should export internal roots/views and avoid direct hook/model logic.
- Keep business logic in `src/react/internal/**` or `src/react/hooks/**`.
- `src/react/internal/**` and `src/react/hooks/**` should not import these public wrappers:
  - `components/activity-bar`
  - `components/bookmark-panel`
  - `components/default-toolbar`
  - `components/pdf-document-view`
  - `components/search-panel`
  - `components/thumbnail-strip`

### Panels

- Public entry: `src/react/components/panels/<panel>.tsx` (wrapper)
- Controller/root: `src/react/internal/use-<panel>-controller.ts` or `src/react/internal/<panel>-root-view.tsx`
- Rendering: `src/react/internal/<panel>-view.tsx`
- Pure logic: `src/react/internal/<panel>-model.ts` / `*-helpers.ts`

### Hooks

- Async hooks should use guard helpers from `src/react/internal/async-guards.ts`.
- Stale completion must be ignored on:
  - document switch
  - page switch
  - unmount

## Test requirements

- Every behavior fix must include at least one test.
- For async changes, include deterministic stale-result coverage.
- Keep/extend contract tests:
  - `test/unit/react/components/component-wrapper-contract.test.ts`
  - `test/unit/react/components/panels/panel-wrapper-contract.test.ts`
  - `test/unit/react/layer-boundary.test.ts`

## Local verification before merge

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test test/unit/react`
- `pnpm test:react:stable`
- `pnpm test:react:memory-regression`

## See also

- [React Architecture](./architecture.md) - Layer boundaries and composition rules.
- [Architecture Map](./architecture-index.md) - Concrete examples of the intended layer split.
- [React Testing](./testing.md) - Required race tests and shared teardown contract.
