# React Architecture Index

This index maps major React modules to the intended layers.

## Layer map

| Layer | Purpose | Representative modules |
| --- | --- | --- |
| `components/**` | Public, thin composition/wrapper entry points | `src/react/components/activity-bar.tsx`, `src/react/components/bookmark-panel.tsx`, `src/react/components/default-toolbar.tsx`, `src/react/components/pdf-document-view.tsx`, `src/react/components/search-panel.tsx`, `src/react/components/thumbnail-strip.tsx`, `src/react/components/panels/forms-panel.tsx`, `src/react/components/panels/links-panel.tsx`, `src/react/components/panels/objects-panel.tsx`, `src/react/components/panels/text-panel.tsx`, `src/react/components/panels/annotations-panel.tsx`, `src/react/components/panels/structure-panel.tsx` |
| `hooks/**` | Stateful orchestration and effect lifecycle | `src/react/hooks/use-controlled-scroll.ts`, `src/react/hooks/use-interaction-mode.ts`, `src/react/hooks/use-print.ts`, `src/react/hooks/use-visible-pages.ts` |
| `internal/*-root-view.tsx` / `internal/*-view.tsx` | UI rendering and panel-local composition | `src/react/internal/links-panel-view.tsx`, `src/react/internal/objects-panel-root-view.tsx`, `src/react/internal/text-panel-root-view.tsx`, `src/react/internal/annotations-panel-root-view.tsx`, `src/react/internal/forms-panel-view.tsx` |
| `internal/*-model.ts` / `internal/*-pipeline.ts` | Pure transforms and deterministic flow helpers | `src/react/internal/controlled-scroll-model.ts`, `src/react/internal/interaction-mode-model.ts`, `src/react/internal/print-pipeline.ts`, `src/react/internal/visible-pages-model.ts`, `src/react/internal/structure-panel-model.ts` |
| `internal/use-*-controller.ts` | View-facing state assembly for complex panels | `src/react/internal/use-forms-panel-controller.ts`, `src/react/internal/use-bookmark-panel-controller.ts`, `src/react/internal/use-pdf-viewer-controller.ts` |

## Feature slices

| Feature | Public entry | Controller/orchestration | View | Model/pipeline |
| --- | --- | --- | --- | --- |
| Activity bar | `src/react/components/activity-bar.tsx` | `src/react/internal/activity-bar-root-view.tsx` | `src/react/internal/activity-bar-view.tsx` | `src/react/internal/activity-bar-model.ts` |
| Bookmark panel | `src/react/components/bookmark-panel.tsx` | `src/react/internal/bookmark-panel-root-view.tsx` | `src/react/internal/bookmark-panel-view.tsx` | `src/react/internal/bookmark-*` |
| Default toolbar | `src/react/components/default-toolbar.tsx` | `src/react/internal/default-toolbar-root-view.tsx` | `src/react/internal/default-toolbar-groups.tsx` | `src/react/internal/default-toolbar-state.ts` |
| Document view | `src/react/components/pdf-document-view.tsx` | `src/react/internal/pdf-document-view-root.tsx` | `src/react/internal/pdf-document-view-renderers.tsx` | `src/react/internal/pdf-document-view-controller.ts` |
| Search panel | `src/react/components/search-panel.tsx` | `src/react/internal/search-panel-view.tsx` | `src/react/internal/search-panel-view.tsx` | `src/react/internal/search-panel-copy.ts` |
| Thumbnail strip | `src/react/components/thumbnail-strip.tsx` | `src/react/internal/thumbnail-strip-root-view.tsx` | `src/react/internal/thumbnail-strip-root-view.tsx` | `src/react/internal/thumbnail-strip-model.ts` |
| Forms panel | `src/react/components/panels/forms-panel.tsx` | `src/react/internal/use-forms-panel-controller.ts` | `src/react/internal/forms-panel-view.tsx` | `src/react/internal/forms-panel-helpers.ts` |
| Links panel | `src/react/components/panels/links-panel.tsx` | `src/react/internal/links-panel-view.tsx` | `src/react/internal/links-panel-view.tsx` | `src/react/internal/links-panel-helpers.ts` |
| Objects panel | `src/react/components/panels/objects-panel.tsx` | `src/react/internal/objects-panel-root-view.tsx` | `src/react/internal/objects-panel-view.tsx` | `src/react/internal/objects-panel-helpers.ts` |
| Text panel | `src/react/components/panels/text-panel.tsx` | `src/react/internal/text-panel-root-view.tsx` | `src/react/internal/text-panel-view.tsx` | `src/react/internal/text-panel-helpers.ts` |
| Annotations panel | `src/react/components/panels/annotations-panel.tsx` | `src/react/internal/annotations-panel-root-view.tsx` | `src/react/internal/annotations-panel-view.tsx` | `src/react/internal/annotations-panel-helpers.ts` |
| Controlled scrolling | `src/react/hooks/use-controlled-scroll.ts` | `src/react/hooks/use-controlled-scroll.ts` | n/a | `src/react/internal/controlled-scroll-model.ts` |
| Interaction mode | `src/react/hooks/use-interaction-mode.ts` | `src/react/hooks/use-interaction-mode.ts` | n/a | `src/react/internal/interaction-mode-model.ts` |
| Printing | `src/react/hooks/use-print.ts` | `src/react/hooks/use-print.ts` | n/a | `src/react/internal/print-pipeline.ts` |

## Contract checks

- Wrapper contract tests: `test/unit/react/components/panels/panel-wrapper-contract.test.ts`
- Controller/view wrapper contract: `test/unit/react/components/panels/forms-panel-wrapper.test.tsx`
- Component wrapper contracts: `test/unit/react/components/component-wrapper-contract.test.ts`
- Layer boundary guardrails: `test/unit/react/layer-boundary.test.ts`
