/**
 * Annotation CRUD hook for the editor.
 *
 * Wraps worker page methods, pushes commands to the undo stack,
 * and bumps the document revision for cache invalidation.
 *
 * @module react/editor/hooks/use-annotation-crud
 */

import { useCallback, useMemo, useRef } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import {
  type AnnotationBorder,
  type AnnotationColourType,
  AnnotationType,
  type Colour,
  type Rect,
} from '../../../core/types.js';
import { usePDFiumDocument, usePDFiumInstance } from '../../context.js';
import {
  type AnnotationStyleBorderMutation,
  type AnnotationStyleColourMutation,
  CompositeCommand,
  CreateAnnotationCommand,
  type CreateAnnotationOptions,
  type PageAccessor,
  RemoveAnnotationCommand,
  SetAnnotationBorderCommand,
  SetAnnotationColourCommand,
  SetAnnotationRectCommand,
  SetAnnotationStringCommand,
  SetAnnotationStyleCommand,
} from '../command.js';
import { useEditor } from '../context.js';
import { type OptimisticAnnotationPatch, useAnnotationMutationStore } from '../internal/annotation-mutation-store.js';
import { getLineLikeEndpoints } from '../line-utils.js';

/**
 * Return type of `useAnnotationCrud`.
 */
export interface AnnotationCrudActions {
  /** Create an annotation and return the serialised result. */
  createAnnotation(subtype: AnnotationType, rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined>;
  /** Remove an annotation by index. Requires a snapshot for undo. */
  removeAnnotation(annotationIndex: number, snapshot: SerialisedAnnotation): Promise<void>;
  /** Move an annotation to a new rect. */
  moveAnnotation(annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void>;
  /** Resize an annotation. */
  resizeAnnotation(annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void>;
  /** Change an annotation's colour. */
  setAnnotationColour(
    annotationIndex: number,
    colourType: AnnotationColourType,
    oldColour: Colour,
    newColour: Colour,
    preserveBorder?: AnnotationBorder | null,
  ): Promise<void>;
  /** Change an annotation's border properties. */
  setAnnotationBorder(annotationIndex: number, oldBorder: AnnotationBorder, newBorder: AnnotationBorder): Promise<void>;
  /**
   * Change stroke/fill/border in a single atomic style mutation.
   *
   * Optional so existing tests/mocks that only implement granular methods
   * remain compatible.
   */
  setAnnotationStyle?(
    annotationIndex: number,
    style: {
      stroke?: AnnotationStyleColourMutation;
      interior?: AnnotationStyleColourMutation;
      border?: AnnotationStyleBorderMutation;
    },
  ): Promise<void>;
  /** Change an annotation's string value (Contents, T, Subj, etc.). */
  setAnnotationString(annotationIndex: number, key: string, oldValue: string, newValue: string): Promise<void>;
  /** Replace a line-fallback Ink annotation while preserving undo/redo as one step. */
  replaceLineFallback(
    snapshot: SerialisedAnnotation,
    rect: Rect,
    start: { x: number; y: number },
    end: { x: number; y: number },
    strokeColour: Colour,
    strokeWidth: number,
  ): Promise<number | undefined>;
}

const EPSILON = 1e-6;
const STYLE_MUTATION_BURST_WINDOW_MS = 120;

interface MutationBurstSample {
  readonly atMs: number;
  readonly count: number;
}

function shouldWarnMutationBursts(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

function rectsEqual(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.left - b.left) < EPSILON &&
    Math.abs(a.top - b.top) < EPSILON &&
    Math.abs(a.right - b.right) < EPSILON &&
    Math.abs(a.bottom - b.bottom) < EPSILON
  );
}

function pointsEqual(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function coloursEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function bordersEqual(a: AnnotationBorder, b: AnnotationBorder): boolean {
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < EPSILON &&
    Math.abs(a.verticalRadius - b.verticalRadius) < EPSILON &&
    Math.abs(a.borderWidth - b.borderWidth) < EPSILON
  );
}

function hasColourStyleMutation(
  mutation: AnnotationStyleColourMutation | undefined,
): mutation is AnnotationStyleColourMutation {
  if (mutation === undefined) {
    return false;
  }
  return !coloursEqual(mutation.oldColour, mutation.newColour);
}

function hasBorderStyleMutation(
  mutation: AnnotationStyleBorderMutation | undefined,
): mutation is AnnotationStyleBorderMutation {
  if (mutation === undefined) {
    return false;
  }
  return !bordersEqual(mutation.oldBorder, mutation.newBorder);
}

function normaliseStrokeWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0.25, value);
}

function getStringMutationPatch(key: string, newValue: string): OptimisticAnnotationPatch | undefined {
  if (key === 'Contents') {
    return { contents: newValue };
  }
  if (key === 'T') {
    return { author: newValue };
  }
  if (key === 'Subj') {
    return { subject: newValue };
  }
  return undefined;
}

/**
 * Provides annotation CRUD operations for a specific page,
 * integrated with the editor's undo/redo stack.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function useAnnotationCrud(document: WorkerPDFiumDocument | null, pageIndex: number): AnnotationCrudActions {
  const { instance } = usePDFiumInstance();
  const { bumpPageRevision } = usePDFiumDocument();
  const { commandStack } = useEditor();
  const mutationStore = useAnnotationMutationStore();
  const mutationBurstSamplesRef = useRef<Map<string, MutationBurstSample>>(new Map());

  // PageAccessor factory — commands open/close pages on each execute/undo
  const getPage: PageAccessor = useCallback(async () => {
    if (!document) throw new Error('No document available');
    return document.getPage(pageIndex);
  }, [document, pageIndex]);

  const createAnnotation = useCallback(
    async (subtype: AnnotationType, rect: Rect, options?: CreateAnnotationOptions): Promise<number | undefined> => {
      if (!document) return undefined;
      const cmd = new CreateAnnotationCommand(getPage, subtype, rect, options);
      await commandStack.push(cmd);
      bumpPageRevision(pageIndex);
      return cmd.createdIndex;
    },
    [document, getPage, commandStack, bumpPageRevision, pageIndex],
  );

  const runWithOptimisticMutation = useCallback(
    async (
      annotationIndex: number,
      patch: OptimisticAnnotationPatch,
      operation: () => Promise<void>,
    ): Promise<void> => {
      const complete = mutationStore.begin(pageIndex, annotationIndex, patch);
      try {
        await operation();
      } catch (error) {
        mutationStore.clear(pageIndex, annotationIndex);
        throw error;
      } finally {
        complete();
      }
    },
    [mutationStore, pageIndex],
  );

  const warnIfStyleMutationBursts = useCallback(
    (kind: 'colour' | 'border', annotationIndex: number): void => {
      if (!shouldWarnMutationBursts() || typeof performance === 'undefined') {
        return;
      }

      const key = `${kind}:${String(pageIndex)}:${String(annotationIndex)}`;
      const nowMs = performance.now();
      const previous = mutationBurstSamplesRef.current.get(key);
      if (previous !== undefined && nowMs - previous.atMs <= STYLE_MUTATION_BURST_WINDOW_MS) {
        const nextCount = previous.count + 1;
        mutationBurstSamplesRef.current.set(key, { atMs: nowMs, count: nextCount });
        if (nextCount === 2 || nextCount === 5) {
          console.warn(
            `[PDFium Editor] Rapid ${kind} mutation burst detected for annotation ${String(annotationIndex)} on page ${String(pageIndex)} (${String(nextCount)} commits inside ${String(STYLE_MUTATION_BURST_WINDOW_MS)}ms window).`,
          );
        }
        return;
      }

      mutationBurstSamplesRef.current.set(key, { atMs: nowMs, count: 1 });
    },
    [pageIndex],
  );

  const removeAnnotation = useCallback(
    async (annotationIndex: number, snapshot: SerialisedAnnotation): Promise<void> => {
      if (!document) return;
      const snapshotRestore =
        instance !== null
          ? {
              document,
              openDocument: (data: Uint8Array | ArrayBuffer) => instance.openDocument(data),
            }
          : undefined;
      const cmd = new RemoveAnnotationCommand(getPage, annotationIndex, snapshot, snapshotRestore);
      await commandStack.push(cmd);
      bumpPageRevision(pageIndex);
      mutationStore.clear(pageIndex, annotationIndex);
    },
    [document, instance, getPage, commandStack, bumpPageRevision, mutationStore, pageIndex],
  );

  const moveAnnotation = useCallback(
    async (annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void> => {
      if (!document) return;
      if (rectsEqual(oldRect, newRect)) return;
      await runWithOptimisticMutation(annotationIndex, { bounds: newRect }, async () => {
        const cmd = new SetAnnotationRectCommand(getPage, annotationIndex, oldRect, newRect, 'Move annotation');
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [document, getPage, commandStack, bumpPageRevision, pageIndex, runWithOptimisticMutation],
  );

  const resizeAnnotation = useCallback(
    async (annotationIndex: number, oldRect: Rect, newRect: Rect): Promise<void> => {
      if (!document) return;
      if (rectsEqual(oldRect, newRect)) return;
      await runWithOptimisticMutation(annotationIndex, { bounds: newRect }, async () => {
        const cmd = new SetAnnotationRectCommand(getPage, annotationIndex, oldRect, newRect, 'Resize annotation');
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [document, getPage, commandStack, bumpPageRevision, pageIndex, runWithOptimisticMutation],
  );

  const setAnnotationColour = useCallback(
    async (
      annotationIndex: number,
      colourType: AnnotationColourType,
      oldColour: Colour,
      newColour: Colour,
      preserveBorder?: AnnotationBorder | null,
    ): Promise<void> => {
      if (!document) return;
      if (coloursEqual(oldColour, newColour)) return;
      warnIfStyleMutationBursts('colour', annotationIndex);
      const patch: OptimisticAnnotationPatch = {
        colour: colourType === 'stroke' ? { stroke: newColour } : { interior: newColour },
        ...(preserveBorder !== undefined ? { border: preserveBorder } : {}),
      };
      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const cmd = new SetAnnotationColourCommand(
          getPage,
          annotationIndex,
          colourType,
          oldColour,
          newColour,
          preserveBorder ?? null,
        );
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [
      document,
      getPage,
      commandStack,
      bumpPageRevision,
      pageIndex,
      runWithOptimisticMutation,
      warnIfStyleMutationBursts,
    ],
  );

  const setAnnotationString = useCallback(
    async (annotationIndex: number, key: string, oldValue: string, newValue: string): Promise<void> => {
      if (!document) return;
      if (oldValue === newValue) return;
      const patch = getStringMutationPatch(key, newValue);
      if (patch === undefined) {
        const cmd = new SetAnnotationStringCommand(getPage, annotationIndex, key, oldValue, newValue);
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
        return;
      }
      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const cmd = new SetAnnotationStringCommand(getPage, annotationIndex, key, oldValue, newValue);
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [document, getPage, commandStack, bumpPageRevision, pageIndex, runWithOptimisticMutation],
  );

  const setAnnotationBorder = useCallback(
    async (annotationIndex: number, oldBorder: AnnotationBorder, newBorder: AnnotationBorder): Promise<void> => {
      if (!document) return;
      if (bordersEqual(oldBorder, newBorder)) return;
      warnIfStyleMutationBursts('border', annotationIndex);
      await runWithOptimisticMutation(annotationIndex, { border: newBorder }, async () => {
        const cmd = new SetAnnotationBorderCommand(getPage, annotationIndex, oldBorder, newBorder);
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [
      document,
      getPage,
      commandStack,
      bumpPageRevision,
      pageIndex,
      runWithOptimisticMutation,
      warnIfStyleMutationBursts,
    ],
  );

  const setAnnotationStyle = useCallback(
    async (
      annotationIndex: number,
      style: {
        stroke?: AnnotationStyleColourMutation;
        interior?: AnnotationStyleColourMutation;
        border?: AnnotationStyleBorderMutation;
      },
    ): Promise<void> => {
      if (!document) return;

      const stroke = hasColourStyleMutation(style.stroke) ? style.stroke : undefined;
      const interior = hasColourStyleMutation(style.interior) ? style.interior : undefined;
      const border = hasBorderStyleMutation(style.border) ? style.border : undefined;
      if (stroke === undefined && interior === undefined && border === undefined) {
        return;
      }

      const patch: OptimisticAnnotationPatch = {
        ...(stroke !== undefined || interior !== undefined
          ? {
              colour: {
                ...(stroke !== undefined ? { stroke: stroke.newColour } : {}),
                ...(interior !== undefined ? { interior: interior.newColour } : {}),
              },
            }
          : {}),
        ...(border !== undefined ? { border: border.newBorder } : {}),
      };

      await runWithOptimisticMutation(annotationIndex, patch, async () => {
        const cmd = new SetAnnotationStyleCommand(getPage, annotationIndex, {
          ...(stroke !== undefined ? { stroke } : {}),
          ...(interior !== undefined ? { interior } : {}),
          ...(border !== undefined ? { border } : {}),
        });
        await commandStack.push(cmd);
        bumpPageRevision(pageIndex);
      });
    },
    [document, getPage, commandStack, bumpPageRevision, pageIndex, runWithOptimisticMutation],
  );

  const replaceLineFallback = useCallback(
    async (
      snapshot: SerialisedAnnotation,
      rect: Rect,
      start: { x: number; y: number },
      end: { x: number; y: number },
      strokeColour: Colour,
      strokeWidth: number,
    ): Promise<number | undefined> => {
      if (!document) return undefined;
      const resolvedStrokeWidth = normaliseStrokeWidth(strokeWidth);
      const currentEndpoints = getLineLikeEndpoints(snapshot);
      const sameGeometry =
        rectsEqual(snapshot.bounds, rect) &&
        currentEndpoints !== undefined &&
        pointsEqual(currentEndpoints.start, start) &&
        pointsEqual(currentEndpoints.end, end);
      const sameStrokeColour = coloursEqual(snapshot.colour.stroke ?? strokeColour, strokeColour);
      const sameStrokeWidth =
        Math.abs((snapshot.border?.borderWidth ?? resolvedStrokeWidth) - resolvedStrokeWidth) < EPSILON;
      if (sameGeometry && sameStrokeColour && sameStrokeWidth) {
        return snapshot.index;
      }

      mutationStore.clear(pageIndex, snapshot.index);
      const removeCommand = new RemoveAnnotationCommand(getPage, snapshot.index, snapshot);
      const createCommand = new CreateAnnotationCommand(getPage, AnnotationType.Ink, rect, {
        colour: strokeColour,
        inkPaths: [[start, end]],
        borderWidth: resolvedStrokeWidth,
        isLineFallback: true,
      });
      await commandStack.push(new CompositeCommand('Transform line annotation', [removeCommand, createCommand]));
      bumpPageRevision(pageIndex);
      return createCommand.createdIndex;
    },
    [document, getPage, commandStack, bumpPageRevision, mutationStore, pageIndex],
  );

  return useMemo(
    () => ({
      createAnnotation,
      removeAnnotation,
      moveAnnotation,
      resizeAnnotation,
      setAnnotationColour,
      setAnnotationBorder,
      setAnnotationStyle,
      setAnnotationString,
      replaceLineFallback,
    }),
    [
      createAnnotation,
      removeAnnotation,
      moveAnnotation,
      resizeAnnotation,
      setAnnotationColour,
      setAnnotationBorder,
      setAnnotationStyle,
      setAnnotationString,
      replaceLineFallback,
    ],
  );
}
