# Editor Remediation Plan (Gold Standard)

Last updated: 2026-03-04
Status: Proposed execution plan
Scope: `@scaryterry/pdfium/react` editor integration and Vite demo (`demo/vite`)

## 1. Problem Statement

The current editor experience has four systemic failures:

1. Two separate and unsynchronised selection models (viewer interaction mode vs editor tool mode).
2. Text markup actions (highlight/underline/strikeout) implemented as persistent modes, not one-shot formatting actions.
3. Redaction UX implies secure redaction, but implementation only marks and (optionally) flattens annotations.
4. Shape/annotation move-resize interactions are unreliable due to overlay hit-testing and mutation strategy.

The failures share a root cause: interaction architecture drift between the viewer state machine and editor state machine.

## 2. Root Causes (Evidence-Backed)

### RC-1: Dual state machines with no bridge

- Viewer interaction controls text selection/pan/marquee via `interaction.mode`.
- Editor separately controls `activeTool` including its own `select` mode.
- No integration layer coordinates them.

Evidence:
- `src/react/internal/default-toolbar-groups.tsx` (Select text button)
- `src/react/hooks/use-interaction-mode.ts` (pointer/pan/marquee behavior)
- `src/react/editor/types.ts` (`EditorTool` includes `select`)
- `demo/vite/src/features/Editor/EditorLab.tsx` (adds second Select button)

Impact:
- User can be in editor tool flows while viewer is in `pan`; text selection becomes impossible.
- Duplicate selection affordances confuse mental model and keyboard behavior.

### RC-2: Markup modeled as tools, not commands

- Highlight/Underline/Strikeout are editor modes.
- Overlay mounts only while a markup mode is active.

Evidence:
- `src/react/editor/types.ts`
- `src/react/editor/components/editor-overlay.tsx`
- `src/react/editor/components/text-markup-overlay.tsx`

Impact:
- Violates expected WYSIWYG flow (select text first, apply style action).
- Leads to mode errors and accidental repeated markups.

### RC-3: Redaction workflow is incomplete and unsafe-by-default

- UI supports mark, but there is no explicit apply-redactions action in the editor toolbar.
- Existing apply path is `page.flatten()`, which is not a complete secure-redaction pipeline.

Evidence:
- `src/react/editor/hooks/use-redaction.ts`
- `src/react/editor/components/editor-overlay.tsx`
- `demo/vite/src/features/Editor/EditorLab.tsx`

Impact:
- User sees drawn redaction regions but cannot complete workflow in UX.
- Security expectation mismatch: flattening annotation appearance is not equivalent to robust content redaction guarantees.

### RC-4: Move/resize interaction conflicts and over-mutation

- Select hit-target overlays are rendered in the same layer pass and can intercept events intended for selection handles/body.
- Move/resize issues are amplified by command-per-pointermove behavior.

Evidence:
- `src/react/editor/components/editor-overlay.tsx` (hit targets + selection overlay layering)
- `src/react/editor/components/selection-overlay.tsx` (continuous pointer move callbacks)
- `src/react/editor/hooks/use-annotation-crud.ts` (each move/resize pushes command)

Impact:
- Drag handles feel non-responsive or impossible to use.
- Undo stack noise and performance instability under drag.

### RC-5: Demo/library sync drift remains easy to trigger

- Demo depends on `link:../..` package exports from `dist/*`, not source.
- Running demo without fresh library build gives stale behavior.

Evidence:
- `demo/vite/package.json`
- `package.json` (exports to `dist/*`)
- `demo/scripts/setup.ts` (asset sync handles `pdfium.cjs`, not editor build freshness)

Impact:
- “Sometimes broken” behavior across runs/branches.
- Debugging friction due to uncertain code provenance.

## 3. Target Product Behavior

### Interaction model

- Exactly one text-selection concept: viewer pointer mode.
- Editor has operation states, not duplicate selection modes.
- Entering editor operations that require text selection auto-forces viewer pointer mode.

### Markup model

- Highlight/Underline/Strikeout are one-shot actions.
- Primary flow: select text, click action, action applies, state returns to neutral.
- Optional repeat mode can exist only behind explicit toggle, disabled by default.

### Redaction model

- Two explicit phases:
  1. Mark redaction regions.
  2. Apply redactions (with confirmation).
- Product language must distinguish "visual mark" vs "applied redaction".
- If secure semantic guarantees are not implemented yet, label as "Flatten redaction marks" (not "Apply redactions").

### Manipulation model

- Selection handles are topmost interactive targets.
- Drag move/resize uses local preview during pointer move.
- Commit one command on pointerup (single undo step), not per move tick.

### Sync model

- Dev loop must enforce fresh library artifacts before demo runtime.
- One command should reliably run watch/build + demo with no stale dist ambiguity.

## 4. Architecture Changes

## A. Unify viewer/editor interaction contract

Add a small controller hook in React editor package:

- `useEditorInteractionBridge(viewerInteraction, editorState)`

Responsibilities:
1. If an editor action requires text selection, force `viewer.interaction.mode = 'pointer'`.
2. Expose one derived state: `canSelectText` and `canManipulateAnnotations`.
3. Remove editor-owned `select text` semantics.

Implementation direction:
- Editor provider should not own text-selection mode.
- Keep annotation selection state, but not a second "select text" tool.

## B. Convert markup tools to command actions

Refactor editor tool taxonomy:

- Replace persistent tools: `highlight`, `underline`, `strikeout`
- Introduce action handlers:
  - `applyHighlightFromSelection()`
  - `applyUnderlineFromSelection()`
  - `applyStrikeoutFromSelection()`

UI behavior:
- Toolbar buttons become action buttons (`aria-pressed` false by default).
- If no selection exists, show deterministic hint (no-op with feedback).

## C. Redaction workflow redesign

Split API and UI capabilities:

1. `markRedaction(rect)` (existing)
2. `commitRedactions(...)` (new semantic endpoint)

Until secure redaction pipeline is implemented:
- Keep current flatten behavior behind explicit label: `Flatten Marked Redactions`.
- Add warning copy in UI and docs.

When secure redaction pipeline exists:
- Replace flatten fallback with real redaction application path.
- Preserve auditability (before/after annotation counts, operation log).

## D. Move/resize interaction rewrite

1. Layering fix
- Ensure selection overlay/handles are rendered above generic hit targets.
- Disable hit target pointer events for selected annotation while selection overlay is active.

2. Mutation strategy fix
- During drag: local ephemeral rect state only.
- On pointerup: push one `SetAnnotationRectCommand` with old/new rect.

3. Hit-testing policy
- Explicitly separate:
  - selection pick zones
  - manipulation handles
  - passive visual overlays

## E. Demo sync hardening

Add root-level dev script(s):

- `pnpm dev:editor` => runs library `build:watch` and demo dev server together.

Add stale-build guard script:

- Validate newest `src/**` mtime <= newest `dist/**` mtime before demo startup.
- If stale: fail with clear remediation command.

Continue worker/source truth model:
- Worker entry only at `demo/vite/src/pdfium.worker.ts`.
- Keep stale `public/worker.js` cleanup in setup script.

## 5. Delivery Plan (Phased)

### Phase 0: Freeze + test baseline (1 day)

Deliverables:
- Add failing E2E tests covering all four reported issues.
- Record baseline behavior and expected post-fix assertions.

Gate:
- Tests must reproduce current failures reliably.

### Phase 1: Interaction unification + toolbar semantics (2-3 days)

Deliverables:
- Remove duplicate editor "Select" tool from demo toolbar.
- Add interaction bridge forcing pointer mode when required.
- Ensure keyboard shortcuts remain canonical (`V/H/Z` from viewer interaction only).

Gate:
- No duplicate "select" affordances.
- Text selection always works when markup/redaction text-dependent actions run.

### Phase 2: Markup action conversion (2-3 days)

Deliverables:
- Convert markup buttons to one-shot actions.
- Keep existing text-selection extraction and quad-point conversion logic.
- Add UX feedback for empty selection.

Gate:
- Markup buttons do not remain active modes.
- One click applies one operation and returns to neutral.

### Phase 3: Redaction workflow correctness (2-4 days)

Deliverables:
- Add explicit apply/flatten action in toolbar and clear state indicators.
- Add confirmation and operation status.
- Update language to match true guarantees.

Gate:
- User can complete mark -> apply workflow entirely from UI.
- Security wording is accurate and non-misleading.

### Phase 4: Move/resize reliability (2-3 days)

Deliverables:
- Fix z-order and event interception.
- Implement drag-preview + single command commit.
- Keep undo/redo semantics deterministic.

Gate:
- Selected annotation can always be moved/resized.
- One drag == one undo step.

### Phase 5: Demo sync guardrails (1 day)

Deliverables:
- `dev:editor` orchestration script.
- stale-dist startup guard.
- short dev README section with blessed commands.

Gate:
- Cannot accidentally run stale demo without explicit warning/failure.

## 6. Verification Matrix

Required automated checks:

1. Browser E2E (`test/browser/editor.spec.ts`)
- Text select + markup one-shot flow.
- Redaction mark + apply flow.
- Move + resize interaction on shapes and ink/stamp where applicable.
- No uncaught runtime errors.

2. Unit tests
- Interaction bridge behavior.
- Toolbar action semantics (buttons not sticky modes).
- Selection overlay layering/hit-testing.
- Single-command-on-drag commit behavior.

3. Regression checks
- Existing viewer interaction tests (`use-interaction-mode`) remain green.
- Undo/redo invariants unchanged for non-editor features.

Manual QA checklist (required before merge):

1. Select text in editor tab without touching any editor-select tool.
2. Apply highlight/underline/strikeout from existing selection.
3. Mark multiple redactions and apply/flatten them successfully.
4. Move and resize rectangle/circle/line reliably with visible handles.
5. Verify undo stack granularity matches user actions.

## 7. Non-Negotiable Quality Bar

1. No ambiguous UX labels where security semantics differ from implementation.
2. No second selection model in editor UI.
3. No command spam during pointer drag.
4. No hidden mode coupling between viewer and editor.
5. All reported user pain points covered by automated tests.

## 8. Initial Task Breakdown (Implementation Tickets)

1. `editor-interaction-bridge`
- Add bridge hook + integrate into `EditorLab` and `EditorOverlay` flow.

2. `markup-actions-not-modes`
- Remove markup from persistent `EditorTool` and wire as actions.

3. `redaction-apply-surface`
- Toolbar/apply action + honest labels + status.

4. `selection-overlay-hit-testing`
- Z-order fix + selected-hit-target pass-through.

5. `drag-commit-command`
- Local drag state, commit rect once on pointerup.

6. `demo-sync-guard`
- stale-dist check + `dev:editor` runner + README command updates.

## 9. Recommended Execution Order

1. Phase 0 baseline tests
2. Phase 4 move/resize reliability (quickest user-visible unblock)
3. Phase 1 interaction unification
4. Phase 2 markup action conversion
5. Phase 3 redaction workflow
6. Phase 5 sync guardrails

Reason:
- Move/resize and interaction unification reduce immediate usability failures first.
- Markup and redaction then align UX semantics and security clarity.
- Sync guardrails prevent recurrence from stale builds.

