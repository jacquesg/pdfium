---
title: React Architecture
description: Layering model and design rules for React viewer code.
---

# React Architecture Notes

See [Architecture Map](./architecture-index.md) for a concrete module-to-layer map.
See [Contributor Playbook](./contributor-playbook.md) for required file shapes and test gates.

## Layering

Keep React code split into clear layers:

- `src/react/components/**`
  - Thin composition and public component entry points.
- `src/react/internal/**`
  - View-model helpers, rendering primitives, orchestration helpers, and panel-specific view/model logic.
- `src/react/hooks/**`
  - Stateful behavior, effects, and async lifecycle guards.

## Panel structure

Preferred panel shape:

1. `components/panels/<panel>.tsx`
   - Thin export/wrapper only.
2. `internal/<panel>-view.tsx`
   - UI rendering and event wiring.
3. `internal/<panel>-model.ts`
   - Pure transformations, labels, and tab/state utilities.

This keeps JSX-heavy rendering isolated from pure model logic and simplifies race-focused unit tests.

## Hook structure

Preferred hook shape:

1. Hook file coordinates refs/effects and public return shape.
2. Pure computation goes in `internal/*-model.ts` modules.
3. Async guard behavior should rely on generation/request tokens instead of mutable booleans.

Examples in this repository:

- `use-visible-pages` + `internal/visible-pages-model.ts`
- provider lifecycle split across:
  - `internal/use-pdfium-provider-controller.ts`
  - `internal/provider-*` modules

## Consistency rules

- Keep external store/cache operations centralized in internal modules (`query-store`, lifecycle helpers).
- Keep format/copy/table concerns in `internal/*-copy.ts` and shared view primitives.
- Minimize component-local side effects; prefer hook-level orchestration and explicit cleanup.

## Review checklist for new React code

- Is stale async completion ignored after dependency changes?
- Are subscriptions/listeners/timers always cleaned?
- Is pure logic separated from render wiring?
- Are tests covering success, failure, and stale-race paths?
