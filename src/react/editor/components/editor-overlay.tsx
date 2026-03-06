/**
 * Editor overlay for a PDF page.
 *
 * Delegates to the correct sub-overlay based on the active tool.
 * Intended to be used as the `renderPageOverlay` prop of `PDFPageView`.
 *
 * @module react/editor/components/editor-overlay
 */

import { type ReactNode, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { AnnotationType, type Colour, type Point, type Rect } from '../../../core/types.js';
import { usePDFViewerOptional } from '../../components/pdf-viewer-context.js';
import { pdfRectToScreen, pdfToScreen, screenToPdf } from '../../coordinates.js';
import { useEditor } from '../context.js';
import { useAnnotationCrud } from '../hooks/use-annotation-crud.js';
import { useAnnotationSelection } from '../hooks/use-annotation-selection.js';
import { useFreeTextInput } from '../hooks/use-freetext-input.js';
import { useInkDrawing } from '../hooks/use-ink-drawing.js';
import { useRedaction } from '../hooks/use-redaction.js';
import { useTextMarkup } from '../hooks/use-text-markup.js';
import { useAnnotationMutationStore, useResolvedEditorAnnotations } from '../internal/annotation-mutation-store.js';
import { getLineLikeEndpoints, isLineLikeAnnotation } from '../line-utils.js';
import { getUnknownErrorMessage, isEditorRedactionAnnotation } from '../redaction-utils.js';
import {
  buildCommittedAnnotationMaskRect,
  CommittedAnnotationMaskOverlay,
} from './committed-annotation-mask-overlay.js';
import { FreeTextEditor } from './freetext-editor.js';
import { InkCanvas } from './ink-canvas.js';
import { RedactionOverlay } from './redaction-overlay.js';
import { SelectionOverlay, type SelectionOverlayAppearance } from './selection-overlay.js';
import { type ShapeCreateDetail, ShapeCreationOverlay } from './shape-creation-overlay.js';
import { TextMarkupOverlay } from './text-markup-overlay.js';

const STAMP_HALF_SIZE = 40;
const PAGE_INDEX_ATTRIBUTE = 'data-page-index';
const MIN_HIT_TARGET_SIZE_PX = 14;
const LINE_HIT_TARGET_PADDING_PX = 8;
const MIN_LINE_HIT_TARGET_STROKE_PX = 18;
const NON_TRANSFORMABLE_ANNOTATION_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Strikeout,
  AnnotationType.Squiggly,
]);
const NON_SELECTABLE_ANNOTATION_TYPES = new Set<AnnotationType>([AnnotationType.Link]);
const TEXT_MARKUP_ANNOTATION_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Strikeout,
  AnnotationType.Squiggly,
]);

function isTransformableAnnotation(annotation: SerialisedAnnotation): boolean {
  return !NON_TRANSFORMABLE_ANNOTATION_TYPES.has(annotation.type);
}

function canRenderHitTarget(annotation: SerialisedAnnotation): boolean {
  return !NON_SELECTABLE_ANNOTATION_TYPES.has(annotation.type);
}

function hasMarkupHitTargetGeometry(annotation: SerialisedAnnotation): boolean {
  return TEXT_MARKUP_ANNOTATION_TYPES.has(annotation.type) && (annotation.attachmentPoints?.length ?? 0) > 0;
}

function quadToScreenPoints(
  quad: NonNullable<SerialisedAnnotation['attachmentPoints']>[number],
  scale: number,
  originalHeight: number,
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  return [
    pdfToScreen({ x: quad.x1, y: quad.y1 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x2, y: quad.y2 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x3, y: quad.y3 }, { scale, originalHeight }),
    pdfToScreen({ x: quad.x4, y: quad.y4 }, { scale, originalHeight }),
  ];
}

function screenPointsToRect(points: readonly { x: number; y: number }[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const left = Math.min(...xValues);
  const right = Math.max(...xValues);
  const top = Math.min(...yValues);
  const bottom = Math.max(...yValues);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

type MarkupHitTargetGeometry =
  | {
      kind: 'highlight';
      points: readonly [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ];
    }
  | {
      kind: 'line';
      start: { x: number; y: number };
      end: { x: number; y: number };
      strokeWidth: number;
    };

function buildMarkupHitTargetGeometry(
  annotation: SerialisedAnnotation,
  quad: NonNullable<SerialisedAnnotation['attachmentPoints']>[number],
  scale: number,
  originalHeight: number,
  _pageWidth: number,
  _pageHeight: number,
): MarkupHitTargetGeometry {
  const [p1, p2, p3, p4] = quadToScreenPoints(quad, scale, originalHeight);
  if (annotation.type === AnnotationType.Highlight) {
    return {
      kind: 'highlight',
      points: [p1, p2, p4, p3],
    };
  }

  const quadRect = screenPointsToRect([p1, p2, p3, p4]);
  const start = annotation.type === AnnotationType.Strikeout ? midpoint(p1, p3) : p1;
  const end = annotation.type === AnnotationType.Strikeout ? midpoint(p2, p4) : p2;
  const hitStrokeWidth = Math.max(10, Math.min(16, quadRect.height + 6));
  return {
    kind: 'line',
    start,
    end,
    strokeWidth: hitStrokeWidth,
  };
}

function buildLineHitTargetGeometry(
  annotation: SerialisedAnnotation,
  scale: number,
  originalHeight: number,
  pageWidth: number,
  pageHeight: number,
): {
  rect: { x: number; y: number; width: number; height: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null {
  const endpoints = getLineLikeEndpoints(annotation);
  if (!endpoints) {
    return null;
  }

  const start = pdfToScreen(endpoints.start, { scale, originalHeight });
  const end = pdfToScreen(endpoints.end, { scale, originalHeight });
  const left = Math.min(start.x, end.x) - LINE_HIT_TARGET_PADDING_PX;
  const top = Math.min(start.y, end.y) - LINE_HIT_TARGET_PADDING_PX;
  const right = Math.max(start.x, end.x) + LINE_HIT_TARGET_PADDING_PX;
  const bottom = Math.max(start.y, end.y) + LINE_HIT_TARGET_PADDING_PX;
  const rect = clampScreenRectToPageBounds(
    {
      x: left,
      y: top,
      width: Math.max(MIN_HIT_TARGET_SIZE_PX, right - left),
      height: Math.max(MIN_HIT_TARGET_SIZE_PX, bottom - top),
    },
    pageWidth,
    pageHeight,
  );

  return {
    rect,
    start: { x: start.x - rect.x, y: start.y - rect.y },
    end: { x: end.x - rect.x, y: end.y - rect.y },
  };
}

function buildEllipseHitTargetGeometry(
  annotation: SerialisedAnnotation,
  scale: number,
  originalHeight: number,
  pageWidth: number,
  pageHeight: number,
): {
  rect: { x: number; y: number; width: number; height: number };
  cx: number;
  cy: number;
  rx: number;
  ry: number;
} {
  const rect = clampScreenRectToPageBounds(
    expandScreenRectForHitTarget(pdfRectToScreen(annotation.bounds, { scale, originalHeight })),
    pageWidth,
    pageHeight,
  );
  return {
    rect,
    cx: rect.width / 2,
    cy: rect.height / 2,
    rx: Math.max(0, rect.width / 2),
    ry: Math.max(0, rect.height / 2),
  };
}

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || element.closest('[contenteditable]:not([contenteditable="false"])') !== null)
  );
}

function findPageRoot(container: HTMLDivElement | null, pageIndex: number): HTMLElement | null {
  const root = container?.closest<HTMLElement>(`[${PAGE_INDEX_ATTRIBUTE}]`);
  if (root) return root;
  return globalThis.document.querySelector<HTMLElement>(`[${PAGE_INDEX_ATTRIBUTE}="${String(pageIndex)}"]`);
}

function applyMarkupOpacity(colour: Colour, opacity: number): Colour {
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  return {
    ...colour,
    a: Math.round(colour.a * clampedOpacity),
  };
}

function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

function eventClientPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
  return { x: event.clientX, y: event.clientY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildFallbackLineRect(start: Point, end: Point, strokeWidth: number, scale: number): Rect {
  const minSpan = Math.max(2 / Math.max(scale, 0.01), strokeWidth);
  let left = Math.min(start.x, end.x);
  let right = Math.max(start.x, end.x);
  let bottom = Math.min(start.y, end.y);
  let top = Math.max(start.y, end.y);
  if (right - left < minSpan) {
    const midX = (left + right) / 2;
    left = midX - minSpan / 2;
    right = midX + minSpan / 2;
  }
  if (top - bottom < minSpan) {
    const midY = (top + bottom) / 2;
    bottom = midY - minSpan / 2;
    top = midY + minSpan / 2;
  }
  return { left, top, right, bottom };
}

function expandScreenRectForHitTarget(
  rect: { x: number; y: number; width: number; height: number },
  minSizePx = MIN_HIT_TARGET_SIZE_PX,
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(rect.width, minSizePx);
  const height = Math.max(rect.height, minSizePx);
  return {
    x: rect.x - (width - rect.width) / 2,
    y: rect.y - (height - rect.height) / 2,
    width,
    height,
  };
}

function clampScreenRectToPageBounds(
  rect: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const maxWidth = Math.max(0, pageWidth);
  const maxHeight = Math.max(0, pageHeight);
  const left = clamp(rect.x, 0, maxWidth);
  const top = clamp(rect.y, 0, maxHeight);
  const right = clamp(rect.x + rect.width, left, maxWidth);
  const bottom = clamp(rect.y + rect.height, top, maxHeight);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function buildSelectionOverlayAppearance(annotation: SerialisedAnnotation): SelectionOverlayAppearance {
  const strokeWidth = Math.max(0.25, annotation.border?.borderWidth ?? 1);
  if (
    (annotation.type === AnnotationType.Highlight ||
      annotation.type === AnnotationType.Underline ||
      annotation.type === AnnotationType.Strikeout ||
      annotation.type === AnnotationType.Squiggly) &&
    (annotation.attachmentPoints?.length ?? 0) > 0
  ) {
    return {
      kind: 'text-markup',
      markupType:
        annotation.type === AnnotationType.Highlight
          ? 'highlight'
          : annotation.type === AnnotationType.Underline
            ? 'underline'
            : annotation.type === AnnotationType.Strikeout
              ? 'strikeout'
              : 'squiggly',
      quads: annotation.attachmentPoints ?? [],
    };
  }
  if (annotation.type === AnnotationType.Square) {
    return {
      kind: 'rectangle',
      strokeWidth,
      ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
      fillColour: annotation.colour.interior ?? null,
    };
  }
  if (annotation.type === AnnotationType.Circle) {
    return {
      kind: 'ellipse',
      strokeWidth,
      ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
      fillColour: annotation.colour.interior ?? null,
    };
  }
  if (isLineLikeAnnotation(annotation)) {
    const endpoints = getLineLikeEndpoints(annotation);
    if (endpoints) {
      return {
        kind: 'line',
        endpoints,
        strokeWidth,
        ...(annotation.colour.stroke !== undefined ? { strokeColour: annotation.colour.stroke } : {}),
      };
    }
  }
  return { kind: 'bounds' };
}

/**
 * Props for the `EditorOverlay` component.
 */
export interface EditorOverlayProps {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Scale factor. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
  /** Annotations on this page (from `useAnnotations`). */
  readonly annotations: readonly SerialisedAnnotation[];
  /** Whether annotation data for this page is still resolving. */
  readonly annotationsPending?: boolean;
  /** The worker document instance. */
  readonly document: WorkerPDFiumDocument | null;
  /** Whether annotation selection/hit-target interactions are enabled. */
  readonly selectionEnabled?: boolean;
}

/**
 * Renders the appropriate editor overlay for the active tool on a page.
 *
 * Supports all editor modes and tools:
 * - `idle` — selection overlay with resize handles
 * - `ink` — freehand drawing canvas
 * - `freetext` — click-to-place text editor
 * - `highlight`, `underline`, `strikeout` — one-shot text markup actions
 * - `rectangle`, `circle`, `line` — shape creation
 * - `redact` — redaction marking with hatched overlay
 * - `stamp` — click-to-place stamp
 *
 * Must be called within an `EditorProvider`.
 */
export function EditorOverlay({
  pageIndex,
  scale,
  originalHeight,
  width,
  height,
  annotations,
  annotationsPending = false,
  document,
  selectionEnabled,
}: EditorOverlayProps): ReactNode {
  const viewerContext = usePDFViewerOptional();
  const viewerInteractionMode = viewerContext?.viewer.interaction.mode;
  const viewerSelectionEnabled = viewerInteractionMode === undefined ? undefined : viewerInteractionMode === 'pointer';
  const effectiveSelectionEnabled = selectionEnabled ?? viewerSelectionEnabled ?? true;
  const { activeTool, setActiveTool, pendingMarkupAction, clearPendingMarkupAction, toolConfigs } = useEditor();
  const crud = useAnnotationCrud(document, pageIndex);
  const mutationStore = useAnnotationMutationStore();
  const committedAnnotations = useResolvedEditorAnnotations(pageIndex, annotations, { includePreview: false });
  const resolvedAnnotations = useResolvedEditorAnnotations(pageIndex, annotations);
  const { selection, select, clearSelection } = useAnnotationSelection(crud, resolvedAnnotations, pageIndex);
  const inkDrawing = useInkDrawing();
  const freetextInput = useFreeTextInput(crud);
  const textMarkup = useTextMarkup(crud);
  const redaction = useRedaction(crud, document);
  const selectedAnnotation =
    selection && selection.pageIndex === pageIndex
      ? (resolvedAnnotations.find((annotation) => annotation.index === selection.annotationIndex) ?? null)
      : null;
  const selectedCommittedAnnotation =
    selection && selection.pageIndex === pageIndex
      ? (committedAnnotations.find((annotation) => annotation.index === selection.annotationIndex) ?? null)
      : null;
  const selectedPreviewPatch =
    selection && selection.pageIndex === pageIndex
      ? mutationStore.getPreviewPatch(pageIndex, selection.annotationIndex)
      : undefined;
  const selectedLineEndpoints =
    selectedAnnotation && isLineLikeAnnotation(selectedAnnotation)
      ? getLineLikeEndpoints(selectedAnnotation)
      : undefined;
  const isNeutralMode = activeTool === 'idle';

  const runMutation = useCallback((promise: Promise<unknown>, onSuccess?: () => void) => {
    void promise
      .then(() => {
        onSuccess?.();
      })
      .catch((error: unknown) => {
        const message = getUnknownErrorMessage(error);
        console.error('[PDFium Editor] Annotation mutation failed:', error);
        if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
          globalThis.dispatchEvent(
            new CustomEvent('pdfium-editor-error', {
              detail: { message },
            }),
          );
        }
      });
  }, []);

  const runCreateAndSelectMutation = useCallback(
    (promise: Promise<number | undefined>) => {
      runMutation(
        promise.then((createdIndex) => {
          if (createdIndex !== undefined) {
            select(pageIndex, createdIndex);
          }
          return createdIndex;
        }),
      );
    },
    [pageIndex, runMutation, select],
  );

  // ── Selection tool handlers ──────────────────────────────────

  const handleMove = useCallback(
    (newRect: Rect) => {
      if (!selection) return;
      const annot = selectedCommittedAnnotation;
      if (!annot) return;
      runMutation(crud.moveAnnotation(selection.annotationIndex, annot.bounds, newRect));
    },
    [selection, selectedCommittedAnnotation, crud, runMutation],
  );

  const handleResize = useCallback(
    (newRect: Rect) => {
      if (!selection) return;
      const annot = selectedCommittedAnnotation;
      if (!annot) return;
      runMutation(crud.resizeAnnotation(selection.annotationIndex, annot.bounds, newRect));
    },
    [selection, selectedCommittedAnnotation, crud, runMutation],
  );

  const commitFallbackLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      const annot = selectedCommittedAnnotation;
      if (!annot || annot.type !== AnnotationType.Ink || annot.lineFallback !== true) return;
      const strokeWidth = Math.max(0.25, annot.border?.borderWidth ?? toolConfigs.line.strokeWidth);
      const nextRect = buildFallbackLineRect(nextLine.start, nextLine.end, strokeWidth, scale);
      const strokeColour = annot.colour.stroke ?? toolConfigs.line.strokeColour;
      runMutation(
        crud
          .replaceLineFallback(annot, nextRect, nextLine.start, nextLine.end, strokeColour, strokeWidth)
          .then((createdIndex) => {
            if (createdIndex !== undefined) {
              select(pageIndex, createdIndex);
            }
          }),
      );
    },
    [
      selectedCommittedAnnotation,
      toolConfigs.line.strokeWidth,
      toolConfigs.line.strokeColour,
      scale,
      crud,
      pageIndex,
      select,
      runMutation,
    ],
  );

  const handleMoveLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      commitFallbackLine(nextLine);
    },
    [commitFallbackLine],
  );

  const handleResizeLine = useCallback(
    (nextLine: { start: Point; end: Point }) => {
      commitFallbackLine(nextLine);
    },
    [commitFallbackLine],
  );

  const previewSelectionRect = useCallback(
    (previewRect: Rect) => {
      if (!selection) return;
      if (selection.pageIndex !== pageIndex) return;
      mutationStore.preview(pageIndex, selection.annotationIndex, {
        bounds: previewRect,
      });
    },
    [mutationStore, selection, pageIndex],
  );

  const previewSelectionLine = useCallback(
    (previewLine: { start: Point; end: Point }) => {
      const previewSource = selectedCommittedAnnotation ?? selectedAnnotation;
      if (!selection || !previewSource) return;
      if (selection.pageIndex !== pageIndex) return;
      const strokeWidth = Math.max(0.25, previewSource.border?.borderWidth ?? toolConfigs.line.strokeWidth);
      mutationStore.preview(pageIndex, selection.annotationIndex, {
        bounds: buildFallbackLineRect(previewLine.start, previewLine.end, strokeWidth, scale),
        ...(previewSource.type === AnnotationType.Line ? { line: previewLine } : {}),
        ...(previewSource.type === AnnotationType.Ink && previewSource.lineFallback === true
          ? { inkPaths: [[previewLine.start, previewLine.end]] }
          : {}),
      });
    },
    [
      mutationStore,
      selection,
      selectedAnnotation,
      selectedCommittedAnnotation,
      pageIndex,
      toolConfigs.line.strokeWidth,
      scale,
    ],
  );

  const clearSelectionPreview = useCallback(() => {
    if (!selection) return;
    if (selection.pageIndex !== pageIndex) return;
    mutationStore.clearPreview(pageIndex, selection.annotationIndex);
  }, [mutationStore, selection, pageIndex]);

  // ── Ink tool handlers ────────────────────────────────────────

  const handleInkComplete = useCallback(
    (points: ReadonlyArray<{ x: number; y: number }>) => {
      if (points.length < 2) return;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      const topLeft = screenToPdf({ x: minX, y: minY }, { scale, originalHeight });
      const bottomRight = screenToPdf({ x: maxX, y: maxY }, { scale, originalHeight });
      const rect: Rect = {
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y,
      };

      // Convert screen points to PDF coordinates for ink stroke
      const pdfPoints = points.map((p) => screenToPdf(p, { scale, originalHeight }));

      runMutation(
        crud.createAnnotation(AnnotationType.Ink, rect, {
          colour: toolConfigs.ink.colour,
          borderWidth: toolConfigs.ink.strokeWidth,
          inkPaths: [pdfPoints],
        }),
      );
    },
    [crud, runMutation, scale, originalHeight, toolConfigs.ink.colour, toolConfigs.ink.strokeWidth],
  );

  // ── Click-to-select handler ──────────────────────────────────

  const handleAnnotationClick = useCallback(
    (annotationIndex: number) => {
      select(pageIndex, annotationIndex);
    },
    [pageIndex, select],
  );

  // Clear annotation selection when clicking empty space on the page.
  // Uses a document-level listener so the text layer stays interactive.
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionPresenceRef = useRef<{ key: string | null; seenInAnnotations: boolean }>({
    key: null,
    seenInAnnotations: false,
  });
  useEffect(() => {
    if (!effectiveSelectionEnabled || !isNeutralMode || !selection) return;
    const primaryDownEventName = typeof globalThis.PointerEvent === 'function' ? 'pointerdown' : 'mousedown';

    const handleDocumentPrimaryDown = (e: PointerEvent | MouseEvent) => {
      if (isSecondaryMouseButton(e)) {
        return;
      }
      const point = eventClientPoint(e);
      const pathElements =
        typeof e.composedPath === 'function'
          ? e.composedPath().filter((node): node is Element => node instanceof Element)
          : [];
      const targetElement = pathElements[0] ?? (e.target instanceof Element ? e.target : null);
      const hitsPropertySidebar = pathElements.some(
        (element) => element.closest('[data-testid="editor-property-sidebar"]') !== null,
      );
      if (hitsPropertySidebar || targetElement?.closest('[data-testid="editor-property-sidebar"]')) return;
      const hitsAnnotationTarget = pathElements.some((element) => element.closest('[data-annotation-index]') !== null);
      if (hitsAnnotationTarget || targetElement?.closest('[data-annotation-index]')) return;
      const hitsSelectionOverlay = pathElements.some(
        (element) => element.closest('[data-testid="selection-overlay"]') !== null,
      );
      if (hitsSelectionOverlay || targetElement?.closest('[data-testid="selection-overlay"]')) return;
      if (isEditableElement(targetElement)) return;
      const pageRoot = findPageRoot(containerRef.current, pageIndex);
      if (!pageRoot) return;
      const pageSelector = `[${PAGE_INDEX_ATTRIBUTE}="${String(pageIndex)}"]`;
      let targetBelongsToPage = targetElement?.closest(pageSelector) === pageRoot;
      if (!targetBelongsToPage && typeof globalThis.document.elementsFromPoint === 'function') {
        const elementsAtPoint = globalThis.document.elementsFromPoint(point.x, point.y);
        targetBelongsToPage = elementsAtPoint.some((element) => element === pageRoot || pageRoot.contains(element));
      }
      if (!targetBelongsToPage) return;
      clearSelection();
    };

    globalThis.document.addEventListener(primaryDownEventName, handleDocumentPrimaryDown, true);
    return () => {
      globalThis.document.removeEventListener(primaryDownEventName, handleDocumentPrimaryDown, true);
    };
  }, [effectiveSelectionEnabled, isNeutralMode, selection, clearSelection, pageIndex]);

  // If the user starts selecting text while an annotation is selected,
  // clear annotation selection so text-selection workflows remain fluid.
  useEffect(() => {
    if (!effectiveSelectionEnabled || !isNeutralMode || !selection) return;

    const handleSelectionChange = () => {
      if (isEditableElement(globalThis.document.activeElement)) {
        return;
      }
      const nativeSelection = globalThis.getSelection?.();
      if (!nativeSelection || nativeSelection.isCollapsed || nativeSelection.rangeCount === 0) return;

      const pageRoot = findPageRoot(containerRef.current, pageIndex);
      if (!pageRoot) return;

      const range = nativeSelection.getRangeAt(0);
      const inPage = pageRoot.contains(range.startContainer) || pageRoot.contains(range.endContainer);
      if (!inPage) return;
      clearSelection();
    };

    globalThis.document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      globalThis.document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [effectiveSelectionEnabled, isNeutralMode, selection, clearSelection, pageIndex]);

  // If selection interactions are disabled (e.g. viewer hand tool),
  // clear any active annotation selection for this page.
  useEffect(() => {
    if (effectiveSelectionEnabled || !selection) return;
    if (selection.pageIndex !== pageIndex) return;
    clearSelection();
  }, [effectiveSelectionEnabled, selection, pageIndex, clearSelection]);

  // If the selected annotation no longer exists on this page
  // (for example after undo/delete/index replacement), clear stale selection.
  useEffect(() => {
    if (!selection) return;
    if (selection.pageIndex !== pageIndex) return;
    if (annotationsPending) return;
    const selectionKey = `${String(selection.pageIndex)}:${String(selection.annotationIndex)}`;
    if (selectionPresenceRef.current.key !== selectionKey) {
      selectionPresenceRef.current = { key: selectionKey, seenInAnnotations: false };
    }
    const stillExists = resolvedAnnotations.some((annotation) => annotation.index === selection.annotationIndex);
    if (stillExists) {
      selectionPresenceRef.current = { key: selectionKey, seenInAnnotations: true };
      return;
    }
    if (!selectionPresenceRef.current.seenInAnnotations) {
      return;
    }
    if (!stillExists) {
      clearSelection();
    }
  }, [selection, pageIndex, annotationsPending, resolvedAnnotations, clearSelection]);

  useEffect(() => {
    if (!selection || selection.pageIndex !== pageIndex) {
      selectionPresenceRef.current = { key: null, seenInAnnotations: false };
    }
  }, [selection, pageIndex]);

  // Cancel pending text-markup actions when selection interactions are disabled
  // (for example while viewer hand tool is active).
  useEffect(() => {
    if (effectiveSelectionEnabled || pendingMarkupAction === null) return;
    clearPendingMarkupAction(pendingMarkupAction.requestId);
  }, [effectiveSelectionEnabled, pendingMarkupAction, clearPendingMarkupAction]);

  // ── FreeText click-to-place handler ──────────────────────────

  const { activate: freetextActivate } = freetextInput;
  const freetextIsActive = freetextInput.state.isActive;

  const handleFreeTextClick = useCallback(
    (e: ReactPointerEvent) => {
      if (isSecondaryMouseButton(e)) return;
      if (freetextIsActive) return;
      e.preventDefault();
      const container = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - container.left;
      const y = e.clientY - container.top;
      freetextActivate({ x, y });
    },
    [freetextActivate, freetextIsActive],
  );

  // ── Shape creation handler ───────────────────────────────────

  const handleShapeCreate = useCallback(
    (rect: Rect, detail?: ShapeCreateDetail) => {
      setActiveTool('idle');
      if (activeTool === 'line') {
        // Intentionally always uses Ink for line tool output.
        // Upstream PDFium does not provide stable Line annotation creation support.
        const lineColour = toolConfigs.line.strokeColour;
        const start = detail?.start ?? { x: rect.left, y: rect.top };
        const end = detail?.end ?? { x: rect.right, y: rect.bottom };
        const lineRect = buildFallbackLineRect(start, end, toolConfigs.line.strokeWidth, scale);

        runCreateAndSelectMutation(
          crud.createAnnotation(AnnotationType.Ink, lineRect, {
            colour: lineColour,
            inkPaths: [[start, end]],
            borderWidth: toolConfigs.line.strokeWidth,
            isLineFallback: true,
          }),
        );
        return;
      }

      if (activeTool !== 'rectangle' && activeTool !== 'circle') {
        return;
      }

      const annotType = activeTool === 'rectangle' ? AnnotationType.Square : AnnotationType.Circle;
      const shapeConfig = toolConfigs[activeTool];
      runCreateAndSelectMutation(
        crud.createAnnotation(annotType, rect, {
          strokeColour: shapeConfig.strokeColour,
          borderWidth: shapeConfig.strokeWidth,
          ...(shapeConfig.fillColour !== null ? { interiorColour: shapeConfig.fillColour } : {}),
        }),
      );
    },
    [activeTool, crud, runCreateAndSelectMutation, scale, setActiveTool, toolConfigs],
  );

  // ── Redact tool handler ──────────────────────────────────────

  const handleRedactCreate = useCallback(
    (rect: Rect) => {
      setActiveTool('idle');
      runCreateAndSelectMutation(redaction.markRedaction(rect, { colour: toolConfigs.redact.fillColour }));
    },
    [redaction, runCreateAndSelectMutation, setActiveTool, toolConfigs.redact.fillColour],
  );

  // ── Stamp click handler ──────────────────────────────────────

  const handleStampClick = useCallback(
    (e: ReactPointerEvent) => {
      if (isSecondaryMouseButton(e)) return;
      e.preventDefault();
      setActiveTool('idle');
      const container = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - container.left;
      const y = e.clientY - container.top;
      const topLeft = screenToPdf({ x: x - STAMP_HALF_SIZE, y: y - STAMP_HALF_SIZE }, { scale, originalHeight });
      const bottomRight = screenToPdf({ x: x + STAMP_HALF_SIZE, y: y + STAMP_HALF_SIZE }, { scale, originalHeight });
      runCreateAndSelectMutation(
        crud.createAnnotation(
          AnnotationType.Stamp,
          {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
          },
          { stampType: toolConfigs.stamp.stampType },
        ),
      );
    },
    [crud, runCreateAndSelectMutation, scale, originalHeight, setActiveTool, toolConfigs.stamp.stampType],
  );

  // ── Text markup handler ──────────────────────────────────────

  const handleTextMarkupCreate = useCallback(
    (rects: readonly Rect[], boundingRect: Rect) => {
      if (!pendingMarkupAction) return;

      const typeMap = {
        highlight: AnnotationType.Highlight,
        underline: AnnotationType.Underline,
        strikeout: AnnotationType.Strikeout,
      } as const;

      const tool = pendingMarkupAction.tool;
      const config = toolConfigs[tool];
      const colour = applyMarkupOpacity(config.colour, config.opacity);
      runCreateAndSelectMutation(textMarkup.createMarkup(typeMap[tool], rects, boundingRect, colour));
    },
    [pendingMarkupAction, textMarkup, runCreateAndSelectMutation, toolConfigs],
  );

  const handleMarkupProcessResult = useCallback(
    (_processed: boolean) => {
      const requestId = pendingMarkupAction?.requestId;
      clearPendingMarkupAction(requestId);
      setActiveTool('idle');
    },
    [pendingMarkupAction?.requestId, clearPendingMarkupAction, setActiveTool],
  );

  // ── Render ───────────────────────────────────────────────────

  const layers: ReactNode[] = [];

  // Always show redaction hatching overlay when there are redact annotations
  const hasRedactions = resolvedAnnotations.some(isEditorRedactionAnnotation);
  if (hasRedactions) {
    layers.push(
      <RedactionOverlay
        key="redaction"
        annotations={resolvedAnnotations}
        scale={scale}
        originalHeight={originalHeight}
        width={width}
        height={height}
      />,
    );
  }

  // Per-annotation hit targets for the select tool.
  // Rendered as small positioned divs over each annotation's bounding box
  // so the text layer beneath remains interactive for text selection.
  if (isNeutralMode && effectiveSelectionEnabled) {
    for (const annot of resolvedAnnotations) {
      if (!canRenderHitTarget(annot)) {
        continue;
      }
      const isSelected = selection?.pageIndex === pageIndex && selection.annotationIndex === annot.index;
      const hitTargetStyle = {
        cursor: 'pointer',
        pointerEvents: isSelected ? 'none' : 'auto',
      } as const;
      const handleHitTargetPointerDown = (event: ReactPointerEvent) => {
        if (isSecondaryMouseButton(event)) return;
        event.preventDefault();
        event.stopPropagation();
        handleAnnotationClick(annot.index);
      };

      if (hasMarkupHitTargetGeometry(annot)) {
        for (const [segmentIndex, quad] of (annot.attachmentPoints ?? []).entries()) {
          const geometry = buildMarkupHitTargetGeometry(annot, quad, scale, originalHeight, width, height);
          if (geometry.kind === 'highlight') {
            layers.push(
              <svg
                key={`select-hit-${annot.index}-${String(segmentIndex)}`}
                aria-hidden="true"
                focusable="false"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width,
                  height,
                  zIndex: 1,
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
              >
                <polygon
                  data-testid="select-hit-target"
                  data-annotation-index={annot.index}
                  data-annotation-segment={String(segmentIndex)}
                  data-hit-target-shape="polygon"
                  points={geometry.points.map((point) => `${String(point.x)},${String(point.y)}`).join(' ')}
                  fill="rgba(0, 0, 0, 0.001)"
                  pointerEvents={isSelected ? 'none' : 'all'}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={handleHitTargetPointerDown}
                />
              </svg>,
            );
          } else {
            layers.push(
              <svg
                key={`select-hit-${annot.index}-${String(segmentIndex)}`}
                aria-hidden="true"
                focusable="false"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width,
                  height,
                  zIndex: 1,
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
              >
                <line
                  data-testid="select-hit-target"
                  data-annotation-index={annot.index}
                  data-annotation-segment={String(segmentIndex)}
                  data-hit-target-shape="line"
                  x1={geometry.start.x}
                  y1={geometry.start.y}
                  x2={geometry.end.x}
                  y2={geometry.end.y}
                  stroke="rgba(0, 0, 0, 0.001)"
                  strokeWidth={geometry.strokeWidth}
                  strokeLinecap="round"
                  pointerEvents={isSelected ? 'none' : 'stroke'}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={handleHitTargetPointerDown}
                />
              </svg>,
            );
          }
        }
        continue;
      }

      if (isLineLikeAnnotation(annot)) {
        const lineGeometry = buildLineHitTargetGeometry(annot, scale, originalHeight, width, height);
        if (lineGeometry !== null) {
          const hitStrokeWidth = Math.max(MIN_LINE_HIT_TARGET_STROKE_PX, (annot.border?.borderWidth ?? 1) * scale + 10);
          layers.push(
            <svg
              key={`select-hit-${annot.index}`}
              aria-hidden="true"
              focusable="false"
              width={lineGeometry.rect.width}
              height={lineGeometry.rect.height}
              viewBox={`0 0 ${String(lineGeometry.rect.width)} ${String(lineGeometry.rect.height)}`}
              style={{
                position: 'absolute',
                left: lineGeometry.rect.x,
                top: lineGeometry.rect.y,
                width: lineGeometry.rect.width,
                height: lineGeometry.rect.height,
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              <line
                data-testid="select-hit-target"
                data-annotation-index={annot.index}
                x1={lineGeometry.start.x}
                y1={lineGeometry.start.y}
                x2={lineGeometry.end.x}
                y2={lineGeometry.end.y}
                stroke="rgba(0, 0, 0, 0.001)"
                strokeWidth={hitStrokeWidth}
                strokeLinecap="round"
                pointerEvents="stroke"
                style={hitTargetStyle}
                onPointerDown={handleHitTargetPointerDown}
              />
            </svg>,
          );
          continue;
        }
      }

      if (annot.type === AnnotationType.Circle) {
        const ellipseGeometry = buildEllipseHitTargetGeometry(annot, scale, originalHeight, width, height);
        layers.push(
          <svg
            key={`select-hit-${annot.index}`}
            aria-hidden="true"
            focusable="false"
            width={ellipseGeometry.rect.width}
            height={ellipseGeometry.rect.height}
            viewBox={`0 0 ${String(ellipseGeometry.rect.width)} ${String(ellipseGeometry.rect.height)}`}
            style={{
              position: 'absolute',
              left: ellipseGeometry.rect.x,
              top: ellipseGeometry.rect.y,
              width: ellipseGeometry.rect.width,
              height: ellipseGeometry.rect.height,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <ellipse
              data-testid="select-hit-target"
              data-annotation-index={annot.index}
              cx={ellipseGeometry.cx}
              cy={ellipseGeometry.cy}
              rx={ellipseGeometry.rx}
              ry={ellipseGeometry.ry}
              fill="rgba(0, 0, 0, 0.001)"
              pointerEvents="all"
              style={hitTargetStyle}
              onPointerDown={handleHitTargetPointerDown}
            />
          </svg>,
        );
        continue;
      }

      const screenRect = clampScreenRectToPageBounds(
        expandScreenRectForHitTarget(pdfRectToScreen(annot.bounds, { scale, originalHeight })),
        width,
        height,
      );
      layers.push(
        <div
          key={`select-hit-${annot.index}`}
          data-testid="select-hit-target"
          data-annotation-index={annot.index}
          style={{
            position: 'absolute',
            left: screenRect.x,
            top: screenRect.y,
            width: screenRect.width,
            height: screenRect.height,
            ...hitTargetStyle,
          }}
          onPointerDown={handleHitTargetPointerDown}
        />,
      );
    }
  }

  // Selection overlay
  if (isNeutralMode && effectiveSelectionEnabled && selectedAnnotation) {
    const interactiveSelection = isTransformableAnnotation(selectedAnnotation);
    const selectionAppearance = buildSelectionOverlayAppearance(selectedAnnotation);
    const activeTransformPreview =
      interactiveSelection &&
      selectionAppearance.kind !== 'bounds' &&
      selectedPreviewPatch !== undefined &&
      (selectedPreviewPatch.bounds !== undefined ||
        selectedPreviewPatch.line !== undefined ||
        selectedPreviewPatch.inkPaths !== undefined);
    const useFallbackLineCallbacks =
      selectedAnnotation.type === AnnotationType.Ink &&
      selectedAnnotation.lineFallback === true &&
      selectedLineEndpoints !== undefined;
    if (
      document !== null &&
      selectedCommittedAnnotation !== null &&
      interactiveSelection &&
      selectionAppearance.kind !== 'bounds'
    ) {
      layers.push(
        <CommittedAnnotationMaskOverlay
          key="selection-mask"
          document={document}
          pageIndex={pageIndex}
          maskRect={buildCommittedAnnotationMaskRect({
            rect: selectedCommittedAnnotation.bounds,
            strokeWidth: Math.max(0.25, selectedCommittedAnnotation.border?.borderWidth ?? 1),
            scale,
            pageWidth: Math.max(width / Math.max(scale, 0.01), selectedCommittedAnnotation.bounds.right),
            pageHeight: Math.max(originalHeight, selectedCommittedAnnotation.bounds.top),
          })}
          scale={scale}
          originalHeight={originalHeight}
          pageWidth={width}
          pageHeight={height}
          active={activeTransformPreview}
        />,
      );
    }
    layers.push(
      <SelectionOverlay
        key="selection"
        rect={selectedAnnotation.bounds}
        scale={scale}
        originalHeight={originalHeight}
        maxWidth={width}
        maxHeight={height}
        appearance={selectionAppearance}
        interactive={interactiveSelection}
        onPreviewRect={previewSelectionRect}
        onPreviewLine={previewSelectionLine}
        onPreviewClear={clearSelectionPreview}
        onMove={handleMove}
        onResize={handleResize}
        {...(useFallbackLineCallbacks ? { onMoveLine: handleMoveLine, onResizeLine: handleResizeLine } : {})}
      />,
    );
  }

  // Ink canvas
  if (effectiveSelectionEnabled && activeTool === 'ink') {
    const inkConfig = toolConfigs.ink;
    const strokeColour = `rgba(${inkConfig.colour.r},${inkConfig.colour.g},${inkConfig.colour.b},${inkConfig.colour.a / 255})`;
    layers.push(
      <InkCanvas
        key="ink"
        drawing={inkDrawing}
        width={width}
        height={height}
        strokeColour={strokeColour}
        strokeWidth={inkConfig.strokeWidth}
        onStrokeComplete={handleInkComplete}
      />,
    );
  }

  // FreeText editor
  if (effectiveSelectionEnabled && activeTool === 'freetext') {
    layers.push(
      <FreeTextEditor
        key="freetext"
        input={freetextInput}
        scale={scale}
        originalHeight={originalHeight}
        fontSize={toolConfigs.freetext.fontSize}
        fontFamily={toolConfigs.freetext.fontName}
      />,
    );

    // Click-to-place overlay when not actively editing
    if (!freetextIsActive) {
      layers.push(
        <div
          key="freetext-click"
          data-testid="freetext-click-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width,
            height,
            cursor: 'text',
            pointerEvents: 'auto',
          }}
          onPointerDown={handleFreeTextClick}
        />,
      );
    }
  }

  // Shape creation (rectangle, circle, line)
  if (effectiveSelectionEnabled && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line')) {
    const shapeConfig = toolConfigs[activeTool];
    const strokeColour = `rgba(${shapeConfig.strokeColour.r},${shapeConfig.strokeColour.g},${shapeConfig.strokeColour.b},1)`;
    layers.push(
      <ShapeCreationOverlay
        key="shape"
        tool={activeTool}
        width={width}
        height={height}
        scale={scale}
        originalHeight={originalHeight}
        strokeColour={strokeColour}
        strokeWidth={shapeConfig.strokeWidth}
        onCreate={handleShapeCreate}
      />,
    );
  }

  // Text markup (highlight, underline, strikeout) — text-selection based
  if (effectiveSelectionEnabled && pendingMarkupAction !== null) {
    layers.push(
      <TextMarkupOverlay
        key="markup"
        tool={pendingMarkupAction.tool}
        width={width}
        height={height}
        scale={scale}
        originalHeight={originalHeight}
        onCreate={handleTextMarkupCreate}
        onProcessResult={handleMarkupProcessResult}
      />,
    );
  }

  // Redact tool — draw regions
  if (effectiveSelectionEnabled && activeTool === 'redact') {
    layers.push(
      <ShapeCreationOverlay
        key="redact-draw"
        tool="rectangle"
        width={width}
        height={height}
        scale={scale}
        originalHeight={originalHeight}
        strokeColour="#cc0000"
        onCreate={handleRedactCreate}
      />,
    );
  }

  // Stamp tool — click-to-place
  if (effectiveSelectionEnabled && activeTool === 'stamp') {
    layers.push(
      <div
        key="stamp"
        data-testid="stamp-click-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          width,
          height,
          cursor: 'crosshair',
          pointerEvents: 'auto',
        }}
        onPointerDown={handleStampClick}
      />,
    );
  }

  if (layers.length === 0) return null;

  return (
    <>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      {layers}
    </>
  );
}
