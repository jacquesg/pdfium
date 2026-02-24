---
title: React Testing
description: React testing standards for deterministic race coverage and lifecycle safety.
---

# React Testing Guide

## Baseline commands

- `pnpm test test/unit/react`
- `pnpm test:react:stable`
- `pnpm test:react:memory-regression`

Use `test:react:stable` for routine local validation. It runs deterministic shards and is resilient to process-level memory pressure.

Use `test:react:memory-regression` when changing async orchestration, cache lifecycles, provider bootstrapping, or panel workflows.

## Global teardown contract

React tests use `test/react-setup.ts` for shared teardown:

- `cleanup()`
- `vi.clearAllMocks()`
- `vi.restoreAllMocks()`
- `vi.resetModules()`
- `vi.unstubAllGlobals()`
- `vi.unstubAllEnvs()`

Avoid duplicating this in individual test files unless a file has additional, file-specific reset state.

## Race testing standards

For async lifecycle tests:

- Prefer deterministic scheduling with `vi.useFakeTimers()` and `vi.advanceTimersByTime(...)`.
- Assert stale completion is ignored after:
  - document instance changes
  - page index changes
  - unmount/remount cycles
- Cover both stale success and stale failure paths.

## Test structure patterns

- Hooks:
  - Use `renderHookWithStores` where store-backed hooks are under test.
  - Assert `isLoading`, `error`, and data transitions explicitly.
- Panels/components:
  - Use explicit UI events + async flush in `act(...)`.
  - Verify stale async results do not re-open alerts, overwrite result banners, or mutate selection on the wrong page.

## Anti-patterns

- Global mutable mocks without reset.
- File-local `afterEach(cleanup)` duplication.
- Time-dependent async tests that rely on real timers and wall-clock waits.

## See also

- [React Contributor Playbook](./contributor-playbook.md) - Merge requirements and local verification checklist.
- [React Architecture](./architecture.md) - Layer boundaries that keep tests deterministic.
- [Architecture Map](./architecture-index.md) - Module index for targeting coverage updates.
