import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../../src/core/types.js';
import type { EditorContextValue } from '../../../../../src/react/editor/context.js';
import type { AnnotationCrudActions } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';
import type { AnnotationSelectionActions } from '../../../../../src/react/editor/hooks/use-annotation-selection.js';
import type { FreeTextInputActions } from '../../../../../src/react/editor/hooks/use-freetext-input.js';
import type { InkDrawingActions } from '../../../../../src/react/editor/hooks/use-ink-drawing.js';
import type { RedactionActions } from '../../../../../src/react/editor/hooks/use-redaction.js';
import type { TextMarkupActions } from '../../../../../src/react/editor/hooks/use-text-markup.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../../../../../src/react/editor/redaction-utils.js';
import { DEFAULT_TOOL_CONFIGS } from '../../../../../src/react/editor/types.js';
import type { InteractionMode } from '../../../../../src/react/hooks/use-interaction-mode.js';

// ── Mock all hooks consumed by EditorOverlay ──────────────────

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-annotation-crud.js', () => ({
  useAnnotationCrud: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-annotation-selection.js', () => ({
  useAnnotationSelection: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-freetext-input.js', () => ({
  useFreeTextInput: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-ink-drawing.js', () => ({
  useInkDrawing: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-redaction.js', () => ({
  useRedaction: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/hooks/use-text-markup.js', () => ({
  useTextMarkup: vi.fn(),
}));

vi.mock('../../../../../src/react/editor/internal/annotation-mutation-store.js', () => ({
  useResolvedEditorAnnotations: vi.fn(
    (_pageIndex: number, annotations: readonly SerialisedAnnotation[]) => annotations,
  ),
  useAnnotationMutationStore: vi.fn(() => ({
    preview: vi.fn(),
    clearPreview: vi.fn(),
    getPreviewPatch: vi.fn(),
  })),
}));

let hasViewerContext = false;
let mockViewerMode: InteractionMode = 'pointer';

vi.mock('../../../../../src/react/components/pdf-viewer-context.js', () => ({
  usePDFViewerOptional: () =>
    hasViewerContext
      ? {
          viewer: {
            interaction: {
              mode: mockViewerMode,
              setMode: vi.fn(),
            },
          },
        }
      : null,
}));

// ── Lazy imports after vi.mock declarations ───────────────────

const { EditorOverlay } = await import('../../../../../src/react/editor/components/editor-overlay.js');
const { useEditor } = await import('../../../../../src/react/editor/context.js');
const { useAnnotationCrud } = await import('../../../../../src/react/editor/hooks/use-annotation-crud.js');
const { useAnnotationSelection } = await import('../../../../../src/react/editor/hooks/use-annotation-selection.js');
const { useFreeTextInput } = await import('../../../../../src/react/editor/hooks/use-freetext-input.js');
const { useInkDrawing } = await import('../../../../../src/react/editor/hooks/use-ink-drawing.js');
const { useRedaction } = await import('../../../../../src/react/editor/hooks/use-redaction.js');
const { useTextMarkup } = await import('../../../../../src/react/editor/hooks/use-text-markup.js');

// ── Typed mock helpers ─────────────────────────────────────────

const mockedUseEditor = vi.mocked(useEditor as () => EditorContextValue);
const mockedUseAnnotationCrud = vi.mocked(
  useAnnotationCrud as (...args: Parameters<typeof useAnnotationCrud>) => AnnotationCrudActions,
);
const mockedUseAnnotationSelection = vi.mocked(
  useAnnotationSelection as (...args: Parameters<typeof useAnnotationSelection>) => AnnotationSelectionActions,
);
const mockedUseFreeTextInput = vi.mocked(
  useFreeTextInput as (...args: Parameters<typeof useFreeTextInput>) => FreeTextInputActions,
);
const mockedUseInkDrawing = vi.mocked(useInkDrawing as () => InkDrawingActions);
const mockedUseRedaction = vi.mocked(useRedaction as (...args: Parameters<typeof useRedaction>) => RedactionActions);
const mockedUseTextMarkup = vi.mocked(
  useTextMarkup as (...args: Parameters<typeof useTextMarkup>) => TextMarkupActions,
);

beforeEach(() => {
  hasViewerContext = false;
  mockViewerMode = 'pointer';
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  } else {
    vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(vi.fn());
  }
});

function createMockCrud(): AnnotationCrudActions {
  return {
    createAnnotation: vi.fn().mockResolvedValue(undefined),
    removeAnnotation: vi.fn().mockResolvedValue(undefined),
    moveAnnotation: vi.fn().mockResolvedValue(undefined),
    resizeAnnotation: vi.fn().mockResolvedValue(undefined),
    setAnnotationColour: vi.fn().mockResolvedValue(undefined),
    setAnnotationBorder: vi.fn().mockResolvedValue(undefined),
    setAnnotationString: vi.fn().mockResolvedValue(undefined),
    replaceLineFallback: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockInkDrawing(): InkDrawingActions {
  return {
    isDrawing: false,
    points: [],
    startStroke: vi.fn(),
    addPoint: vi.fn(),
    finishStroke: vi.fn().mockReturnValue([]),
    cancelStroke: vi.fn(),
  };
}

function createMockFreetextInput(isActive = false): FreeTextInputActions {
  return {
    state: { isActive, position: isActive ? { x: 10, y: 10 } : null, text: '' },
    activate: vi.fn(),
    setText: vi.fn(),
    confirm: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
  };
}

function createMockEditorContext(activeTool: string): EditorContextValue {
  return {
    activeTool: activeTool as EditorContextValue['activeTool'],
    setActiveTool: vi.fn(),
    pendingMarkupAction: null,
    triggerMarkupAction: vi.fn(),
    clearPendingMarkupAction: vi.fn(),
    selection: null,
    setSelection: vi.fn(),
    toolConfigs: DEFAULT_TOOL_CONFIGS,
    updateToolConfig: vi.fn(),
    isDirty: false,
    canUndo: false,
    canRedo: false,
    undo: vi.fn().mockResolvedValue(undefined),
    redo: vi.fn().mockResolvedValue(undefined),
    markClean: vi.fn(),
    commandStack: {} as EditorContextValue['commandStack'],
  };
}

function setupDefaultMocks(
  activeTool: string,
  selectionOverride: AnnotationSelectionActions['selection'] = null,
  pendingMarkupAction: EditorContextValue['pendingMarkupAction'] = null,
): void {
  mockedUseEditor.mockReturnValue({
    ...createMockEditorContext(activeTool),
    pendingMarkupAction,
  });
  mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
  mockedUseAnnotationSelection.mockReturnValue({
    selection: selectionOverride,
    select: vi.fn(),
    clearSelection: vi.fn(),
  });
  mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
  mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
  mockedUseRedaction.mockReturnValue({
    markRedaction: vi.fn().mockResolvedValue(undefined),
    applyRedactions: vi.fn().mockResolvedValue(undefined),
    isApplying: false,
  });
  mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });
}

const defaultOverlayProps = {
  pageIndex: 0,
  scale: 1,
  originalHeight: 792,
  width: 600,
  height: 800,
  annotations: [] as readonly SerialisedAnnotation[],
  document: null,
};

function makeAnnotation(
  index: number,
  type = AnnotationType.Square,
  overrides: Partial<SerialisedAnnotation> = {},
): SerialisedAnnotation {
  const base = {
    index,
    type,
    bounds: { left: 10, top: 200, right: 100, bottom: 100 },
    colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
    flags: 0,
    contents: '',
    author: '',
    subject: '',
    border: null,
    appearance: null,
    fontSize: 0,
    line: undefined,
    vertices: undefined,
    inkPaths: undefined,
    attachmentPoints: undefined,
    widget: undefined,
    link: undefined,
  } as unknown as SerialisedAnnotation;
  return { ...base, ...overrides };
}

describe('EditorOverlay', () => {
  describe('null return', () => {
    it('returns null when no layers apply (idle mode, no selection, no annotations)', () => {
      setupDefaultMocks('idle');
      const { container } = render(<EditorOverlay {...defaultOverlayProps} />);
      // idle mode with no annotations renders no hit targets → null
      expect(container.firstChild).toBeNull();
    });
  });

  describe('idle mode', () => {
    it('renders SelectionOverlay when annotation is selected on this page', () => {
      const annotations = [makeAnnotation(0)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.getByTestId('selection-body')).toBeDefined();
    });

    it('does NOT render SelectionOverlay when selection is on a different page', () => {
      const annotations = [makeAnnotation(0)];
      setupDefaultMocks('idle', { pageIndex: 1, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} pageIndex={0} annotations={annotations} />);
      expect(screen.queryByTestId('selection-body')).toBeNull();
    });

    it('does NOT render SelectionOverlay when there is no selection', () => {
      setupDefaultMocks('idle', null);
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.queryByTestId('selection-body')).toBeNull();
    });

    it('does not clear a newly selected annotation before the refreshed annotation list catches up', () => {
      const annotations = [makeAnnotation(0)];
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 99 },
        select: vi.fn(),
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(clearSelectionFn).not.toHaveBeenCalled();
    });

    it('clears stale selection when a previously observed annotation disappears', () => {
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: vi.fn(),
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      const { rerender } = render(<EditorOverlay {...defaultOverlayProps} annotations={[makeAnnotation(0)]} />);
      expect(clearSelectionFn).not.toHaveBeenCalled();

      rerender(<EditorOverlay {...defaultOverlayProps} annotations={[]} />);
      expect(clearSelectionFn).toHaveBeenCalled();
    });

    it('renders per-annotation hit targets in idle mode', () => {
      const annotations = [makeAnnotation(0), makeAnnotation(1)];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      const hitTargets = screen.getAllByTestId('select-hit-target');
      expect(hitTargets).toHaveLength(2);
    });

    it('expands tiny annotation hit targets to a minimum interactive size', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Ink, {
          bounds: { left: 10, top: 200, right: 11, bottom: 199 },
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target') as HTMLElement;
      expect(Number.parseFloat(hitTarget.style.width)).toBeGreaterThanOrEqual(14);
      expect(Number.parseFloat(hitTarget.style.height)).toBeGreaterThanOrEqual(14);
    });

    it('does not render selection interactions when selectionEnabled is false', () => {
      const annotations = [makeAnnotation(0), makeAnnotation(1)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} selectionEnabled={false} />);
      expect(screen.queryByTestId('select-hit-target')).toBeNull();
      expect(screen.queryByTestId('selection-body')).toBeNull();
    });

    it('defaults to disabled selection interactions when viewer mode is hand/pan', () => {
      hasViewerContext = true;
      mockViewerMode = 'pan';
      const annotations = [makeAnnotation(0), makeAnnotation(1)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.queryByTestId('select-hit-target')).toBeNull();
      expect(screen.queryByTestId('selection-body')).toBeNull();
    });

    it('defaults to enabled selection interactions when viewer mode is pointer', () => {
      hasViewerContext = true;
      mockViewerMode = 'pointer';
      const annotations = [makeAnnotation(0), makeAnnotation(1)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      const hitTargets = screen.getAllByTestId('select-hit-target');
      expect(hitTargets).toHaveLength(2);
      expect(screen.getByTestId('selection-body')).toBeDefined();
    });

    it('renders non-interactive selection overlay for text markup annotations', () => {
      const annotations = [makeAnnotation(0, AnnotationType.Highlight)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const overlay = screen.getByTestId('selection-overlay');
      expect((overlay as HTMLElement).style.pointerEvents).toBe('none');
      expect(screen.queryByTestId('handle-nw')).toBeNull();
    });

    it('renders one hit target per markup quad instead of one coarse bounds hit target', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Highlight, {
          bounds: { left: 10, top: 220, right: 220, bottom: 120 },
          attachmentPoints: [
            { x1: 10, y1: 190, x2: 110, y2: 190, x3: 10, y3: 210, x4: 110, y4: 210 },
            { x1: 10, y1: 150, x2: 140, y2: 150, x3: 10, y3: 170, x4: 140, y4: 170 },
          ],
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTargets = screen.getAllByTestId('select-hit-target');
      expect(hitTargets).toHaveLength(2);
      expect(hitTargets[0]?.tagName.toLowerCase()).toBe('polygon');
      expect(hitTargets[0]?.getAttribute('data-annotation-index')).toBe('0');
      expect(hitTargets[1]?.getAttribute('data-annotation-segment')).toBe('1');
      expect(hitTargets[0]?.getAttribute('data-hit-target-shape')).toBe('polygon');
    });

    it('renders underline annotations with line-shaped hit targets instead of quad rectangles', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Underline, {
          bounds: { left: 10, top: 220, right: 220, bottom: 120 },
          attachmentPoints: [{ x1: 10, y1: 190, x2: 110, y2: 190, x3: 10, y3: 210, x4: 110, y4: 210 }],
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      expect(hitTarget.tagName.toLowerCase()).toBe('line');
      expect(hitTarget.getAttribute('data-hit-target-shape')).toBe('line');
    });

    it('renders strikeout annotations with line-shaped hit targets instead of quad rectangles', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Strikeout, {
          bounds: { left: 10, top: 220, right: 220, bottom: 120 },
          attachmentPoints: [{ x1: 10, y1: 190, x2: 110, y2: 190, x3: 10, y3: 210, x4: 110, y4: 210 }],
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      expect(hitTarget.tagName.toLowerCase()).toBe('line');
      expect(hitTarget.getAttribute('data-hit-target-shape')).toBe('line');
    });

    it('renders squiggly annotations with line-shaped hit targets instead of quad rectangles', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Squiggly, {
          bounds: { left: 10, top: 220, right: 220, bottom: 120 },
          attachmentPoints: [{ x1: 10, y1: 190, x2: 110, y2: 190, x3: 10, y3: 210, x4: 110, y4: 210 }],
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      expect(hitTarget.tagName.toLowerCase()).toBe('line');
      expect(hitTarget.getAttribute('data-hit-target-shape')).toBe('line');
    });

    it('renders line annotations with line-shaped hit targets instead of generic bounds boxes', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Ink, {
          lineFallback: true,
          border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
          inkPaths: [
            [
              { x: 10, y: 180 },
              { x: 100, y: 120 },
            ],
          ],
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      expect(hitTarget.tagName.toLowerCase()).toBe('line');
    });

    it('renders circle annotations with ellipse-shaped hit targets instead of generic bounds boxes', () => {
      const annotations = [
        makeAnnotation(0, AnnotationType.Circle, {
          bounds: { left: 20, top: 220, right: 180, bottom: 80 },
          border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
        }),
      ];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      expect(hitTarget.tagName.toLowerCase()).toBe('ellipse');
    });

    it('moves line fallback annotations via replaceLineFallback, not generic rect move', async () => {
      const lineFallback = makeAnnotation(0, AnnotationType.Ink, {
        lineFallback: true,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 90, y: 100 },
          ],
        ],
      });
      const crud = createMockCrud();
      vi.mocked(crud.replaceLineFallback).mockResolvedValue(9);
      const selectFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: selectFn,
        clearSelection: vi.fn(),
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={[lineFallback]} />);
      const body = screen.getByTestId('selection-body');
      expect(screen.getByTestId('handle-start')).toBeDefined();
      expect(screen.getByTestId('handle-end')).toBeDefined();
      expect(screen.queryByTestId('handle-se')).toBeNull();
      fireEvent.pointerDown(body, { pointerId: 1, clientX: 20, clientY: 20 });
      const overlay = screen.getByTestId('selection-overlay');
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 40, clientY: 40 });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 40, clientY: 40 });

      await vi.waitFor(() => {
        expect(crud.replaceLineFallback).toHaveBeenCalledOnce();
      });
      expect(crud.moveAnnotation).not.toHaveBeenCalled();
      expect(selectFn).toHaveBeenCalledWith(0, 9);
    });

    it('resizes line fallback annotations via replaceLineFallback, not generic rect resize', async () => {
      const lineFallback = makeAnnotation(0, AnnotationType.Ink, {
        lineFallback: true,
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 90, y: 100 },
          ],
        ],
      });
      const crud = createMockCrud();
      vi.mocked(crud.replaceLineFallback).mockResolvedValue(12);
      const selectFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: selectFn,
        clearSelection: vi.fn(),
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={[lineFallback]} />);
      const handle = screen.getByTestId('handle-end');
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
      const overlay = screen.getByTestId('selection-overlay');
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 130, clientY: 130 });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 130, clientY: 130 });

      await vi.waitFor(() => {
        expect(crud.replaceLineFallback).toHaveBeenCalledOnce();
      });
      expect(crud.resizeAnnotation).not.toHaveBeenCalled();
      expect(selectFn).toHaveBeenCalledWith(0, 12);
    });
  });

  describe('ink tool', () => {
    it('renders InkCanvas with data-testid="ink-canvas"', () => {
      setupDefaultMocks('ink');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('ink-canvas')).toBeDefined();
    });

    it('creates ink annotations with configured stroke width', async () => {
      const crud = createMockCrud();
      const drawing: InkDrawingActions = {
        ...createMockInkDrawing(),
        isDrawing: true,
        finishStroke: vi.fn().mockReturnValue([
          { x: 10, y: 10 },
          { x: 80, y: 20 },
        ]),
      };

      mockedUseEditor.mockReturnValue(createMockEditorContext('ink'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(drawing);
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);
      const canvas = screen.getByTestId('ink-canvas');
      fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10, button: 0, pointerType: 'mouse' });
      fireEvent.pointerUp(canvas, { pointerId: 1 });

      await Promise.resolve();

      expect(crud.createAnnotation).toHaveBeenCalledWith(
        AnnotationType.Ink,
        expect.any(Object),
        expect.objectContaining({
          colour: DEFAULT_TOOL_CONFIGS.ink.colour,
          borderWidth: DEFAULT_TOOL_CONFIGS.ink.strokeWidth,
          inkPaths: expect.any(Array),
        }),
      );
    });
  });

  describe('freetext tool', () => {
    it('renders freetext-click-overlay when not actively editing', () => {
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('freetext-click-overlay')).toBeDefined();
    });

    it('does NOT render freetext-click-overlay when editor is active', () => {
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(true));
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.queryByTestId('freetext-click-overlay')).toBeNull();
    });
  });

  describe('shape tools', () => {
    it('renders ShapeCreationOverlay for rectangle tool', () => {
      setupDefaultMocks('rectangle');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
    });

    it('renders ShapeCreationOverlay for circle tool', () => {
      setupDefaultMocks('circle');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
    });

    it('renders ShapeCreationOverlay for line tool', () => {
      setupDefaultMocks('line');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
    });

    it('does not render shape creation overlay when selection interactions are disabled', () => {
      setupDefaultMocks('rectangle');
      render(<EditorOverlay {...defaultOverlayProps} selectionEnabled={false} />);
      expect(screen.queryByTestId('shape-creation-overlay')).toBeNull();
    });

    it('returns to select tool after creating a rectangle', async () => {
      const crud = createMockCrud();
      crud.createAnnotation = vi.fn().mockResolvedValue(7);
      const setActiveTool = vi.fn();
      const select = vi.fn();
      const editorContext: EditorContextValue = {
        ...createMockEditorContext('rectangle'),
        setActiveTool,
      };

      mockedUseEditor.mockReturnValue(editorContext);
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select, clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 80, clientY: 80 });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 80, clientY: 80 });

      await Promise.resolve();

      expect(crud.createAnnotation).toHaveBeenCalledWith(
        AnnotationType.Square,
        expect.any(Object),
        expect.objectContaining({
          strokeColour: DEFAULT_TOOL_CONFIGS.rectangle.strokeColour,
          borderWidth: DEFAULT_TOOL_CONFIGS.rectangle.strokeWidth,
        }),
      );
      expect(setActiveTool).toHaveBeenCalledWith('idle');
      expect(select).toHaveBeenCalledWith(0, 7);
    });

    it('creates a line tool annotation as Ink with a stroke path', async () => {
      const crud = createMockCrud();

      mockedUseEditor.mockReturnValue(createMockEditorContext('line'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 120, clientY: 12 });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 120, clientY: 12 });

      await Promise.resolve();
      await Promise.resolve();

      expect(crud.createAnnotation).toHaveBeenCalledWith(
        AnnotationType.Ink,
        expect.any(Object),
        expect.objectContaining({
          colour: DEFAULT_TOOL_CONFIGS.line.strokeColour,
          borderWidth: DEFAULT_TOOL_CONFIGS.line.strokeWidth,
          isLineFallback: true,
          inkPaths: expect.any(Array),
        }),
      );
    });
  });

  describe('redact tool', () => {
    it('renders ShapeCreationOverlay for drawing redaction regions', () => {
      setupDefaultMocks('redact');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
    });
  });

  describe('stamp tool', () => {
    it('renders stamp-click-overlay', () => {
      setupDefaultMocks('stamp');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('stamp-click-overlay')).toBeDefined();
    });
  });

  describe('redaction hatching overlay', () => {
    it('renders redaction-overlay SVG when Redact annotations exist (any tool)', () => {
      const annotations = [makeAnnotation(0, AnnotationType.Redact)];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.getByTestId('redaction-overlay')).toBeDefined();
    });

    it('renders redaction-overlay for pseudo-redaction fallback squares', () => {
      const annotations = [makeAnnotation(0, AnnotationType.Square, { contents: REDACTION_FALLBACK_CONTENTS_MARKER })];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.getByTestId('redaction-overlay')).toBeDefined();
    });

    it('does NOT render redaction-overlay when there are no Redact annotations', () => {
      const annotations = [makeAnnotation(0, AnnotationType.Square)];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.queryByTestId('redaction-overlay')).toBeNull();
    });
  });

  describe('click-to-select hit-testing', () => {
    it('selects an annotation when clicking its hit target', () => {
      const annotations = [makeAnnotation(0)];
      const selectFn = vi.fn();
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: null,
        select: selectFn,
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      hitTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(selectFn).toHaveBeenCalledWith(0, 0);
    });

    it('ignores secondary mouse button when clicking hit targets', () => {
      const annotations = [makeAnnotation(0)];
      const selectFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: null,
        select: selectFn,
        clearSelection: vi.fn(),
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      hitTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, pointerType: 'mouse' }));

      expect(selectFn).not.toHaveBeenCalled();
    });

    it('accepts touch pointer events for hit-target selection', () => {
      const annotations = [makeAnnotation(0)];
      const selectFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: null,
        select: selectFn,
        clearSelection: vi.fn(),
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);

      const hitTarget = screen.getByTestId('select-hit-target');
      hitTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, pointerType: 'touch' }));

      expect(selectFn).toHaveBeenCalledWith(0, 0);
    });

    it('clears selection when clicking empty space on the page', () => {
      const annotations = [makeAnnotation(0)];
      const selectFn = vi.fn();
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        // Must have an active selection for the clear-selection listener to be active
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: selectFn,
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(
        <div data-page-index="0">
          <div data-testid="page-text-layer">Sample page text</div>
          <EditorOverlay {...defaultOverlayProps} annotations={annotations} />
        </div>,
      );

      // Click on page content that's outside annotation hit targets.
      const textLayer = screen.getByTestId('page-text-layer');
      textLayer.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      expect(clearSelectionFn).toHaveBeenCalled();
    });

    it('clears selection when text selection is made on the page', () => {
      const annotations = [makeAnnotation(0)];
      const selectFn = vi.fn();
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: selectFn,
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(
        <div data-page-index="0">
          <span data-testid="page-text-span">Lorem ipsum</span>
          <EditorOverlay {...defaultOverlayProps} annotations={annotations} />
        </div>,
      );

      const textSpan = screen.getByTestId('page-text-span');
      const textNode = textSpan.firstChild;
      expect(textNode).not.toBeNull();
      const range = document.createRange();
      range.setStart(textNode!, 0);
      range.setEnd(textNode!, 5);
      const selection = {
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => range,
      } as unknown as Selection;
      const getSelectionSpy = vi.spyOn(globalThis, 'getSelection').mockReturnValue(selection);

      document.dispatchEvent(new Event('selectionchange'));
      expect(clearSelectionFn).toHaveBeenCalled();

      getSelectionSpy.mockRestore();
    });

    it('does not clear selection on selectionchange while an editable control is focused', () => {
      const annotations = [makeAnnotation(0)];
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: vi.fn(),
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(
        <div data-page-index="0">
          <input data-testid="outside-input" />
          <span data-testid="page-text-span">Lorem ipsum</span>
          <EditorOverlay {...defaultOverlayProps} annotations={annotations} />
        </div>,
      );

      const input = screen.getByTestId('outside-input') as HTMLInputElement;
      input.focus();
      expect(document.activeElement).toBe(input);

      const textSpan = screen.getByTestId('page-text-span');
      const textNode = textSpan.firstChild;
      expect(textNode).not.toBeNull();
      const range = document.createRange();
      range.setStart(textNode!, 0);
      range.setEnd(textNode!, 5);
      const selection = {
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => range,
      } as unknown as Selection;
      const getSelectionSpy = vi.spyOn(globalThis, 'getSelection').mockReturnValue(selection);

      document.dispatchEvent(new Event('selectionchange'));
      expect(clearSelectionFn).not.toHaveBeenCalled();

      getSelectionSpy.mockRestore();
    });

    it('clears an active selection when selection interactions are disabled', () => {
      const annotations = [makeAnnotation(0)];
      const clearSelectionFn = vi.fn();
      mockedUseEditor.mockReturnValue(createMockEditorContext('idle'));
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({
        selection: { pageIndex: 0, annotationIndex: 0 },
        select: vi.fn(),
        clearSelection: clearSelectionFn,
      });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} selectionEnabled={false} />);
      expect(clearSelectionFn).toHaveBeenCalled();
    });
  });

  describe('text markup actions', () => {
    it('renders TextMarkupOverlay for pending highlight action', () => {
      setupDefaultMocks('idle', null, { tool: 'highlight', requestId: 1 });
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('text-markup-overlay')).toBeDefined();
    });

    it('renders TextMarkupOverlay for pending underline action', () => {
      setupDefaultMocks('idle', null, { tool: 'underline', requestId: 2 });
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('text-markup-overlay')).toBeDefined();
    });

    it('renders TextMarkupOverlay for pending strikeout action', () => {
      setupDefaultMocks('idle', null, { tool: 'strikeout', requestId: 3 });
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('text-markup-overlay')).toBeDefined();
    });

    it('creates underline markup with Underline subtype and applies tool opacity', async () => {
      const createMarkup = vi.fn().mockResolvedValue(9);
      const select = vi.fn();
      const editorContext: EditorContextValue = {
        ...createMockEditorContext('idle'),
        pendingMarkupAction: { tool: 'underline', requestId: 10 },
        toolConfigs: {
          ...DEFAULT_TOOL_CONFIGS,
          underline: {
            colour: { r: 10, g: 120, b: 30, a: 200 },
            opacity: 0.25,
          },
        },
      };

      mockedUseEditor.mockReturnValue(editorContext);
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select, clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup });

      render(<EditorOverlay {...defaultOverlayProps} />);

      const overlay = screen.getByTestId('text-markup-overlay');
      const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
      vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

      const mockRange = {
        getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
      };
      vi.spyOn(document, 'getSelection').mockReturnValue({
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => mockRange,
        removeAllRanges: vi.fn(),
      } as unknown as Selection);

      document.dispatchEvent(new Event('pointerup'));

      expect(createMarkup).toHaveBeenCalledTimes(1);
      const [subtype, rects, boundingRect, colour] = createMarkup.mock.calls[0]!;
      expect(subtype).toBe(AnnotationType.Underline);
      expect(rects).toHaveLength(1);
      expect(boundingRect).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
      expect(colour).toEqual({ r: 10, g: 120, b: 30, a: 50 });
      await waitFor(() => {
        expect(select).toHaveBeenCalledWith(0, 9);
      });
    });

    it('clears pending markup action when selection interactions are disabled', () => {
      const clearPendingMarkupAction = vi.fn();
      mockedUseEditor.mockReturnValue({
        ...createMockEditorContext('idle'),
        pendingMarkupAction: { tool: 'highlight', requestId: 42 },
        clearPendingMarkupAction,
      });
      mockedUseAnnotationCrud.mockReturnValue(createMockCrud());
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} selectionEnabled={false} />);

      expect(clearPendingMarkupAction).toHaveBeenCalledWith(42);
    });
  });

  describe('stamp tool — interaction', () => {
    it('calls createAnnotation with Stamp type and stampType from config on click', async () => {
      const crud = createMockCrud();
      const setActiveTool = vi.fn();
      mockedUseEditor.mockReturnValue({
        ...createMockEditorContext('stamp'),
        setActiveTool,
      });
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);

      const overlay = screen.getByTestId('stamp-click-overlay');
      overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));

      expect(crud.createAnnotation).toHaveBeenCalledWith(
        AnnotationType.Stamp,
        expect.objectContaining({ left: expect.any(Number), top: expect.any(Number) }),
        { stampType: 'Draft' },
      );
      await Promise.resolve();
      expect(setActiveTool).toHaveBeenCalledWith('idle');
    });

    it('stamp-click-overlay has pointer-events auto', () => {
      setupDefaultMocks('stamp');
      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('stamp-click-overlay');
      expect((overlay as HTMLElement).style.pointerEvents).toBe('auto');
    });

    it('ignores secondary mouse button for stamp placement', () => {
      const crud = createMockCrud();
      mockedUseEditor.mockReturnValue(createMockEditorContext('stamp'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('stamp-click-overlay');
      overlay.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 2, pointerType: 'mouse' }),
      );

      expect(crud.createAnnotation).not.toHaveBeenCalled();
    });

    it('accepts touch pointer events for stamp placement', () => {
      const crud = createMockCrud();
      mockedUseEditor.mockReturnValue(createMockEditorContext('stamp'));
      mockedUseAnnotationCrud.mockReturnValue(crud);
      mockedUseAnnotationSelection.mockReturnValue({ selection: null, select: vi.fn(), clearSelection: vi.fn() });
      mockedUseFreeTextInput.mockReturnValue(createMockFreetextInput(false));
      mockedUseInkDrawing.mockReturnValue(createMockInkDrawing());
      mockedUseRedaction.mockReturnValue({
        markRedaction: vi.fn().mockResolvedValue(undefined),
        applyRedactions: vi.fn().mockResolvedValue(undefined),
        isApplying: false,
      });
      mockedUseTextMarkup.mockReturnValue({ createMarkup: vi.fn().mockResolvedValue(undefined) });

      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('stamp-click-overlay');
      overlay.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 2, pointerType: 'touch' }),
      );

      expect(crud.createAnnotation).toHaveBeenCalledWith(
        AnnotationType.Stamp,
        expect.objectContaining({ left: expect.any(Number), top: expect.any(Number) }),
        { stampType: 'Draft' },
      );
    });
  });

  describe('ink tool — rendering', () => {
    it('renders InkCanvas element for ink tool', () => {
      setupDefaultMocks('ink');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.getByTestId('ink-canvas')).toBeDefined();
    });

    it('does not render InkCanvas for non-ink tools', () => {
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} />);
      expect(screen.queryByTestId('ink-canvas')).toBeNull();
    });
  });

  describe('freetext tool — interaction', () => {
    it('calls freetextInput.activate when clicking the click overlay', () => {
      const freetextActions = createMockFreetextInput(false);
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(freetextActions);

      render(<EditorOverlay {...defaultOverlayProps} />);

      const overlay = screen.getByTestId('freetext-click-overlay');
      overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 60 }));

      expect(freetextActions.activate).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      );
    });

    it('does not call activate when freetext editor is already active', () => {
      const freetextActions = createMockFreetextInput(true);
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(freetextActions);

      render(<EditorOverlay {...defaultOverlayProps} />);

      // No click overlay when active — activate should never be called
      expect(screen.queryByTestId('freetext-click-overlay')).toBeNull();
      expect(freetextActions.activate).not.toHaveBeenCalled();
    });

    it('ignores secondary mouse button for freetext placement', () => {
      const freetextActions = createMockFreetextInput(false);
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(freetextActions);

      render(<EditorOverlay {...defaultOverlayProps} />);

      const overlay = screen.getByTestId('freetext-click-overlay');
      overlay.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 60, button: 2, pointerType: 'mouse' }),
      );

      expect(freetextActions.activate).not.toHaveBeenCalled();
    });

    it('accepts touch pointer events for freetext placement', () => {
      const freetextActions = createMockFreetextInput(false);
      setupDefaultMocks('freetext');
      mockedUseFreeTextInput.mockReturnValue(freetextActions);

      render(<EditorOverlay {...defaultOverlayProps} />);

      const overlay = screen.getByTestId('freetext-click-overlay');
      overlay.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 60, button: 2, pointerType: 'touch' }),
      );

      expect(freetextActions.activate).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      );
    });
  });

  describe('shape tools — tool prop forwarded correctly', () => {
    it('ShapeCreationOverlay for rectangle has crosshair cursor', () => {
      setupDefaultMocks('rectangle');
      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      expect((overlay as HTMLElement).style.cursor).toBe('crosshair');
    });

    it('ShapeCreationOverlay for circle has crosshair cursor', () => {
      setupDefaultMocks('circle');
      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      expect((overlay as HTMLElement).style.cursor).toBe('crosshair');
    });

    it('ShapeCreationOverlay for line has crosshair cursor', () => {
      setupDefaultMocks('line');
      render(<EditorOverlay {...defaultOverlayProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      expect((overlay as HTMLElement).style.cursor).toBe('crosshair');
    });

    it('each shape tool renders its own ShapeCreationOverlay', () => {
      for (const tool of ['rectangle', 'circle', 'line'] as const) {
        setupDefaultMocks(tool);
        const { unmount } = render(<EditorOverlay {...defaultOverlayProps} />);
        expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
        unmount();
      }
    });
  });

  describe('idle mode — hit target behaviour', () => {
    it('hit targets have pointer-events auto', () => {
      const annotations = [makeAnnotation(0)];
      setupDefaultMocks('idle');
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      const hitTarget = screen.getByTestId('select-hit-target');
      expect((hitTarget as HTMLElement).style.pointerEvents).toBe('auto');
    });

    it('hit targets are present alongside selection overlay when an annotation is selected', () => {
      const annotations = [makeAnnotation(0)];
      setupDefaultMocks('idle', { pageIndex: 0, annotationIndex: 0 });
      render(<EditorOverlay {...defaultOverlayProps} annotations={annotations} />);
      expect(screen.getByTestId('selection-body')).toBeDefined();
      expect(screen.getByTestId('select-hit-target')).toBeDefined();
    });
  });
});
