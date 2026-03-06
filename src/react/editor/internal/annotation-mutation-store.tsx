/**
 * Shared optimistic annotation mutation store.
 *
 * Keeps short-lived, per-annotation optimistic patches while worker mutations
 * are in flight so overlays and panels render from a single authoritative
 * transient state.
 *
 * @module react/editor/internal/annotation-mutation-store
 */

import { createContext, type ReactNode, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationBorder, Colour, Rect } from '../../../core/types.js';

const FLOAT_TOLERANCE = 1e-3;
const STALE_SETTLED_PATCH_GRACE_MS = 1_500;

function makeKey(pageIndex: number, annotationIndex: number): string {
  return `${String(pageIndex)}:${String(annotationIndex)}`;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function coloursEqual(a: Colour | undefined, b: Colour | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function bordersEqual(a: AnnotationBorder | null | undefined, b: AnnotationBorder | null | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < FLOAT_TOLERANCE &&
    Math.abs(a.verticalRadius - b.verticalRadius) < FLOAT_TOLERANCE &&
    Math.abs(a.borderWidth - b.borderWidth) < FLOAT_TOLERANCE
  );
}

function rectsEqual(a: Rect | undefined, b: Rect | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return (
    Math.abs(a.left - b.left) < FLOAT_TOLERANCE &&
    Math.abs(a.top - b.top) < FLOAT_TOLERANCE &&
    Math.abs(a.right - b.right) < FLOAT_TOLERANCE &&
    Math.abs(a.bottom - b.bottom) < FLOAT_TOLERANCE
  );
}

function mergeColourPatch(
  base: OptimisticAnnotationPatch['colour'] | undefined,
  incoming: OptimisticAnnotationPatch['colour'] | undefined,
): OptimisticAnnotationPatch['colour'] | undefined {
  if (incoming === undefined) return base;
  if (base === undefined) return incoming;
  const stroke = incoming.stroke ?? base.stroke;
  const interior = incoming.interior ?? base.interior;
  if (stroke === undefined && interior === undefined) {
    return undefined;
  }
  const merged: { stroke?: Colour; interior?: Colour } = {};
  if (stroke !== undefined) {
    merged.stroke = stroke;
  }
  if (interior !== undefined) {
    merged.interior = interior;
  }
  return merged;
}

/**
 * Optimistic patch for a serialised annotation.
 */
export interface OptimisticAnnotationPatch {
  readonly bounds?: Rect;
  readonly border?: AnnotationBorder | null;
  readonly colour?: {
    readonly stroke?: Colour;
    readonly interior?: Colour;
  };
  readonly line?: SerialisedAnnotation['line'];
  readonly inkPaths?: SerialisedAnnotation['inkPaths'];
  readonly contents?: string;
  readonly author?: string;
  readonly subject?: string;
}

export interface ResolvedEditorAnnotationsOptions {
  /** Include transient preview patches in the resolved annotation list. Default: true. */
  readonly includePreview?: boolean;
}

interface OptimisticAnnotationEntry {
  readonly pendingCount: number;
  readonly patch: OptimisticAnnotationPatch;
  readonly settledAtMs: number | null;
}

function mergePatch(base: OptimisticAnnotationPatch, incoming: OptimisticAnnotationPatch): OptimisticAnnotationPatch {
  const merged: {
    bounds?: Rect;
    border?: AnnotationBorder | null;
    colour?: { stroke?: Colour; interior?: Colour };
    line?: SerialisedAnnotation['line'];
    inkPaths?: SerialisedAnnotation['inkPaths'];
    contents?: string;
    author?: string;
    subject?: string;
  } = {};
  const mergedColour = mergeColourPatch(base.colour, incoming.colour);

  if (incoming.bounds !== undefined) {
    merged.bounds = incoming.bounds;
  } else if (base.bounds !== undefined) {
    merged.bounds = base.bounds;
  }

  if (incoming.border !== undefined) {
    merged.border = incoming.border;
  } else if (base.border !== undefined) {
    merged.border = base.border;
  }

  if (incoming.line !== undefined) {
    merged.line = incoming.line;
  } else if (base.line !== undefined) {
    merged.line = base.line;
  }

  if (incoming.inkPaths !== undefined) {
    merged.inkPaths = incoming.inkPaths;
  } else if (base.inkPaths !== undefined) {
    merged.inkPaths = base.inkPaths;
  }

  if (incoming.contents !== undefined) {
    merged.contents = incoming.contents;
  } else if (base.contents !== undefined) {
    merged.contents = base.contents;
  }

  if (incoming.author !== undefined) {
    merged.author = incoming.author;
  } else if (base.author !== undefined) {
    merged.author = base.author;
  }

  if (incoming.subject !== undefined) {
    merged.subject = incoming.subject;
  } else if (base.subject !== undefined) {
    merged.subject = base.subject;
  }

  if (mergedColour !== undefined) {
    merged.colour = mergedColour;
  }

  return merged;
}

function applyPatch(annotation: SerialisedAnnotation, patch: OptimisticAnnotationPatch): SerialisedAnnotation {
  const nextColour =
    patch.colour === undefined
      ? annotation.colour
      : {
          ...(patch.colour.stroke !== undefined
            ? { stroke: patch.colour.stroke }
            : { stroke: annotation.colour.stroke }),
          ...(patch.colour.interior !== undefined
            ? { interior: patch.colour.interior }
            : { interior: annotation.colour.interior }),
        };

  return {
    ...annotation,
    ...(patch.bounds !== undefined ? { bounds: patch.bounds } : {}),
    ...(patch.border !== undefined ? { border: patch.border } : {}),
    ...(patch.line !== undefined ? { line: patch.line } : {}),
    ...(patch.inkPaths !== undefined ? { inkPaths: patch.inkPaths } : {}),
    ...(patch.contents !== undefined ? { contents: patch.contents } : {}),
    ...(patch.author !== undefined ? { author: patch.author } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.colour !== undefined ? { colour: nextColour } : {}),
  };
}

function pointsEqual(a: { x: number; y: number } | undefined, b: { x: number; y: number } | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return Math.abs(a.x - b.x) < FLOAT_TOLERANCE && Math.abs(a.y - b.y) < FLOAT_TOLERANCE;
}

function linesEqual(a: SerialisedAnnotation['line'], b: SerialisedAnnotation['line']): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return pointsEqual(a.start, b.start) && pointsEqual(a.end, b.end);
}

function inkPathsEqual(a: SerialisedAnnotation['inkPaths'], b: SerialisedAnnotation['inkPaths']): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  for (let pathIndex = 0; pathIndex < a.length; pathIndex += 1) {
    const pathA = a[pathIndex];
    const pathB = b[pathIndex];
    if ((pathA?.length ?? 0) !== (pathB?.length ?? 0)) {
      return false;
    }
    for (let pointIndex = 0; pointIndex < (pathA?.length ?? 0); pointIndex += 1) {
      if (!pointsEqual(pathA?.[pointIndex], pathB?.[pointIndex])) {
        return false;
      }
    }
  }
  return true;
}

function annotationMatchesPatch(annotation: SerialisedAnnotation, patch: OptimisticAnnotationPatch): boolean {
  if (patch.bounds !== undefined && !rectsEqual(annotation.bounds, patch.bounds)) {
    return false;
  }
  if (patch.border !== undefined && !bordersEqual(annotation.border, patch.border)) {
    return false;
  }
  if (patch.line !== undefined && !linesEqual(annotation.line, patch.line)) {
    return false;
  }
  if (patch.inkPaths !== undefined && !inkPathsEqual(annotation.inkPaths, patch.inkPaths)) {
    return false;
  }
  if (patch.contents !== undefined && annotation.contents !== patch.contents) {
    return false;
  }
  if (patch.author !== undefined && annotation.author !== patch.author) {
    return false;
  }
  if (patch.subject !== undefined && annotation.subject !== patch.subject) {
    return false;
  }
  if (patch.colour !== undefined) {
    if (patch.colour.stroke !== undefined && !coloursEqual(annotation.colour.stroke, patch.colour.stroke)) {
      return false;
    }
    if (patch.colour.interior !== undefined && !coloursEqual(annotation.colour.interior, patch.colour.interior)) {
      return false;
    }
  }
  return true;
}

/**
 * Mutable store of optimistic annotation mutations.
 */
export class AnnotationMutationStore {
  readonly #listeners = new Set<() => void>();
  readonly #entries = new Map<string, OptimisticAnnotationEntry>();
  readonly #previewPatches = new Map<string, OptimisticAnnotationPatch>();
  readonly #idleWaiters = new Set<() => void>();
  readonly #staleEntryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  #version = 0;

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getSnapshot(): number {
    return this.#version;
  }

  #notify(): void {
    this.#version++;
    for (const listener of this.#listeners) {
      listener();
    }
  }

  destroy(): void {
    for (const timer of this.#staleEntryTimers.values()) {
      clearTimeout(timer);
    }
    this.#staleEntryTimers.clear();
    this.#entries.clear();
    this.#previewPatches.clear();
    this.#resolveIdleWaiters();
    this.#listeners.clear();
    this.#version = 0;
  }

  reset(): void {
    if (this.#staleEntryTimers.size === 0 && this.#entries.size === 0 && this.#previewPatches.size === 0) {
      return;
    }
    for (const timer of this.#staleEntryTimers.values()) {
      clearTimeout(timer);
    }
    this.#staleEntryTimers.clear();
    this.#entries.clear();
    this.#previewPatches.clear();
    this.#resolveIdleWaiters();
    this.#notify();
  }

  #clearStaleEntryTimer(key: string): void {
    const timer = this.#staleEntryTimers.get(key);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.#staleEntryTimers.delete(key);
  }

  #scheduleStaleEntryTimer(key: string): void {
    this.#clearStaleEntryTimer(key);
    const timer = setTimeout(() => {
      this.#staleEntryTimers.delete(key);
      this.#notify();
    }, STALE_SETTLED_PATCH_GRACE_MS);
    this.#staleEntryTimers.set(key, timer);
  }

  #resolveIdleWaiters(): void {
    if (this.#idleWaiters.size === 0) return;
    for (const resolve of this.#idleWaiters) {
      resolve();
    }
    this.#idleWaiters.clear();
  }

  #resolveIdleWaitersIfIdle(): void {
    if (this.hasAnyPending()) return;
    this.#resolveIdleWaiters();
  }

  begin(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): () => void {
    const key = makeKey(pageIndex, annotationIndex);
    const existing = this.#entries.get(key);
    const hasActiveMutation = (existing?.pendingCount ?? 0) > 0;
    const nextPatch = existing && hasActiveMutation ? mergePatch(existing.patch, patch) : patch;
    this.#clearStaleEntryTimer(key);
    this.#entries.set(key, {
      pendingCount: (existing?.pendingCount ?? 0) + 1,
      patch: nextPatch,
      settledAtMs: null,
    });
    this.#notify();

    let completed = false;
    return () => {
      if (completed) return;
      completed = true;
      const current = this.#entries.get(key);
      if (current === undefined) return;
      const pendingCount = Math.max(0, current.pendingCount - 1);
      const settledAtMs = pendingCount === 0 ? Date.now() : null;
      this.#entries.set(key, { ...current, pendingCount, settledAtMs });
      if (pendingCount === 0) {
        this.#scheduleStaleEntryTimer(key);
      } else {
        this.#clearStaleEntryTimer(key);
      }
      this.#resolveIdleWaitersIfIdle();
      this.#notify();
    };
  }

  clear(pageIndex: number, annotationIndex: number): void {
    const key = makeKey(pageIndex, annotationIndex);
    const hadEntry = this.#entries.has(key);
    const hadPreview = this.#previewPatches.has(key);
    if (!hadEntry && !hadPreview) return;
    if (hadEntry) {
      this.#clearStaleEntryTimer(key);
      this.#entries.delete(key);
    }
    if (hadPreview) {
      this.#previewPatches.delete(key);
    }
    this.#resolveIdleWaitersIfIdle();
    this.#notify();
  }

  getPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
    return this.#entries.get(makeKey(pageIndex, annotationIndex))?.patch;
  }

  getPreviewPatch(pageIndex: number, annotationIndex: number): OptimisticAnnotationPatch | undefined {
    return this.#previewPatches.get(makeKey(pageIndex, annotationIndex));
  }

  preview(pageIndex: number, annotationIndex: number, patch: OptimisticAnnotationPatch): void {
    const key = makeKey(pageIndex, annotationIndex);
    const existing = this.#previewPatches.get(key);
    const nextPatch = existing ? mergePatch(existing, patch) : patch;
    this.#previewPatches.set(key, nextPatch);
    this.#notify();
  }

  clearPreview(pageIndex: number, annotationIndex: number): void {
    const key = makeKey(pageIndex, annotationIndex);
    if (!this.#previewPatches.has(key)) return;
    this.#previewPatches.delete(key);
    this.#notify();
  }

  hasPending(pageIndex: number, annotationIndex: number): boolean {
    const entry = this.#entries.get(makeKey(pageIndex, annotationIndex));
    return (entry?.pendingCount ?? 0) > 0;
  }

  hasAnyPending(): boolean {
    for (const entry of this.#entries.values()) {
      if (entry.pendingCount > 0) {
        return true;
      }
    }
    return false;
  }

  waitForIdle(): Promise<void> {
    if (!this.hasAnyPending()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#idleWaiters.add(resolve);
    });
  }

  mergeForPage(
    pageIndex: number,
    annotations: readonly SerialisedAnnotation[],
    includePreview = true,
  ): readonly SerialisedAnnotation[] {
    let changed = false;
    const merged = annotations.map((annotation) => {
      const key = makeKey(pageIndex, annotation.index);
      const mutationPatch = this.#entries.get(key)?.patch;
      const previewPatch = includePreview ? this.#previewPatches.get(key) : undefined;
      if (mutationPatch === undefined && previewPatch === undefined) {
        return annotation;
      }
      changed = true;
      const withMutation = mutationPatch === undefined ? annotation : applyPatch(annotation, mutationPatch);
      return previewPatch === undefined ? withMutation : applyPatch(withMutation, previewPatch);
    });
    return changed ? merged : annotations;
  }

  acknowledge(pageIndex: number, annotations: readonly SerialisedAnnotation[]): void {
    const byIndex = new Map<number, SerialisedAnnotation>();
    for (const annotation of annotations) {
      byIndex.set(annotation.index, annotation);
    }

    let changed = false;
    for (const [key, entry] of this.#entries.entries()) {
      const [pagePart, indexPart] = key.split(':');
      const keyPageIndex = Number.parseInt(pagePart ?? '', 10);
      const keyAnnotationIndex = Number.parseInt(indexPart ?? '', 10);
      if (!isFiniteNumber(keyPageIndex) || !isFiniteNumber(keyAnnotationIndex)) {
        continue;
      }
      if (keyPageIndex !== pageIndex || entry.pendingCount > 0) {
        continue;
      }

      const annotation = byIndex.get(keyAnnotationIndex);
      const stalePatchExpired =
        entry.settledAtMs !== null && Date.now() - entry.settledAtMs >= STALE_SETTLED_PATCH_GRACE_MS;
      if (annotation === undefined || annotationMatchesPatch(annotation, entry.patch) || stalePatchExpired) {
        this.#clearStaleEntryTimer(key);
        this.#entries.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.#notify();
    }
  }
}

const AnnotationMutationStoreContext = createContext<AnnotationMutationStore | null>(null);

/**
 * Provider for annotation mutation optimistic state.
 */
export interface AnnotationMutationStoreProviderProps {
  readonly children: ReactNode;
  /** Optional externally managed store instance. */
  readonly store?: AnnotationMutationStore;
}

export function AnnotationMutationStoreProvider({
  children,
  store: providedStore,
}: AnnotationMutationStoreProviderProps): ReactNode {
  const ownedStore = useMemo(() => new AnnotationMutationStore(), []);
  const store = providedStore ?? ownedStore;
  useEffect(
    () => () => {
      if (providedStore === undefined) {
        ownedStore.destroy();
      }
    },
    [ownedStore, providedStore],
  );
  return <AnnotationMutationStoreContext.Provider value={store}>{children}</AnnotationMutationStoreContext.Provider>;
}

/**
 * Access the shared annotation mutation store.
 */
export function useAnnotationMutationStore(): AnnotationMutationStore {
  const store = useContext(AnnotationMutationStoreContext);
  if (store === null) {
    throw new Error('useAnnotationMutationStore must be used within an EditorProvider');
  }
  return store;
}

/**
 * Resolve page annotations with optimistic patches from in-flight mutations.
 */
export function useResolvedEditorAnnotations(
  pageIndex: number,
  annotations: readonly SerialisedAnnotation[],
  options?: ResolvedEditorAnnotationsOptions,
): readonly SerialisedAnnotation[] {
  const store = useAnnotationMutationStore();
  const includePreview = options?.includePreview ?? true;
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );

  const resolved = useMemo(() => {
    void version;
    return store.mergeForPage(pageIndex, annotations, includePreview);
  }, [store, pageIndex, annotations, includePreview, version]);

  useEffect(() => {
    void version;
    store.acknowledge(pageIndex, annotations);
  }, [store, pageIndex, annotations, version]);

  return resolved;
}

/**
 * Returns whether an annotation currently has at least one in-flight mutation.
 */
export function useAnnotationMutationPending(pageIndex: number, annotationIndex: number): boolean {
  const store = useAnnotationMutationStore();
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
  void version;
  return store.hasPending(pageIndex, annotationIndex);
}

/**
 * Returns whether any annotation mutation is currently in-flight.
 */
export function useAnyAnnotationMutationPending(): boolean {
  const store = useAnnotationMutationStore();
  const version = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
  void version;
  return store.hasAnyPending();
}
