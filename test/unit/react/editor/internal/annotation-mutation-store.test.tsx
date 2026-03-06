import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { SerialisedAnnotation } from '../../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../../src/core/types.js';
import {
  AnnotationMutationStore,
  AnnotationMutationStoreProvider,
  useAnnotationMutationPending,
  useAnnotationMutationStore,
  useAnyAnnotationMutationPending,
  useResolvedEditorAnnotations,
} from '../../../../../src/react/editor/internal/annotation-mutation-store.js';

function Wrapper({ children }: { children: ReactNode }) {
  return <AnnotationMutationStoreProvider>{children}</AnnotationMutationStoreProvider>;
}

function makeAnnotation(overrides: Partial<SerialisedAnnotation> = {}): SerialisedAnnotation {
  return {
    index: 1,
    type: AnnotationType.Square,
    bounds: { left: 10, top: 40, right: 90, bottom: 12 },
    colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
    flags: 0,
    contents: '',
    author: '',
    subject: '',
    border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
    appearance: null,
    fontSize: 0,
    line: undefined,
    vertices: undefined,
    inkPaths: undefined,
    attachmentPoints: undefined,
    widget: undefined,
    link: undefined,
    ...overrides,
  };
}

describe('annotation-mutation-store acknowledgement tolerance', () => {
  it('throws when the mutation-store hook is used outside the provider', () => {
    const renderOutsideProvider = () => renderHook(() => useAnnotationMutationStore());
    expect(renderOutsideProvider).toThrow('useAnnotationMutationStore must be used within an EditorProvider');
  });

  it('waitForIdle resolves immediately when no mutation is pending', async () => {
    const store = new AnnotationMutationStore();
    await expect(store.waitForIdle()).resolves.toBeUndefined();
  });

  it('clear removes both mutation and preview patches for an annotation', () => {
    const store = new AnnotationMutationStore();
    const complete = store.begin(0, 1, {
      border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
    });
    store.preview(0, 1, {
      colour: {
        stroke: { r: 1, g: 2, b: 3, a: 255 },
      },
    });

    expect(store.getPatch(0, 1)).toBeDefined();
    expect(store.getPreviewPatch(0, 1)).toBeDefined();

    complete();
    store.clear(0, 1);

    expect(store.getPatch(0, 1)).toBeUndefined();
    expect(store.getPreviewPatch(0, 1)).toBeUndefined();
    expect(store.hasPending(0, 1)).toBe(false);
  });

  it('can resolve annotations without preview patches when includePreview=false', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations, { includePreview: false });
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.begin(0, 1, {
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
        },
      });
      result.current.store.preview(0, 1, {
        colour: {
          stroke: { r: 0, g: 0, b: 255, a: 255 },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });
  });

  it('tracks per-annotation and global pending hooks through mutation completion', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const annotationPending = useAnnotationMutationPending(0, 1);
        const anyPending = useAnyAnnotationMutationPending();
        void useResolvedEditorAnnotations(0, annotations);
        return { store, annotationPending, anyPending };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    let complete: (() => void) | null = null;
    act(() => {
      complete = result.current.store.begin(0, 1, {
        contents: 'pending',
      });
    });

    await waitFor(() => {
      expect(result.current.annotationPending).toBe(true);
      expect(result.current.anyPending).toBe(true);
    });

    act(() => {
      complete?.();
    });

    await waitFor(() => {
      expect(result.current.annotationPending).toBe(false);
      expect(result.current.anyPending).toBe(false);
    });
  });

  it('does not destroy an externally provided store on provider unmount', () => {
    const externalStore = new AnnotationMutationStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AnnotationMutationStoreProvider store={externalStore}>{children}</AnnotationMutationStoreProvider>
    );
    const { result, unmount } = renderHook(() => useAnnotationMutationStore(), { wrapper });

    act(() => {
      result.current.preview(0, 1, {
        contents: 'kept',
      });
    });

    unmount();

    expect(externalStore.getPreviewPatch(0, 1)).toEqual({ contents: 'kept' });
  });

  it('waitForIdle resolves only after all in-flight mutations are completed', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        void useResolvedEditorAnnotations(0, annotations);
        return { store };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    let completeFirst: (() => void) | null = null;
    let completeSecond: (() => void) | null = null;
    act(() => {
      completeFirst = result.current.store.begin(0, 1, {
        colour: {
          stroke: { r: 10, g: 20, b: 30, a: 255 },
        },
      });
      completeSecond = result.current.store.begin(0, 2, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      });
    });

    expect(result.current.store.hasAnyPending()).toBe(true);

    let idleResolved = false;
    const idlePromise = result.current.store.waitForIdle().then(() => {
      idleResolved = true;
    });

    act(() => {
      completeFirst?.();
    });
    await Promise.resolve();
    expect(idleResolved).toBe(false);

    act(() => {
      completeSecond?.();
    });
    await idlePromise;
    expect(idleResolved).toBe(true);
    expect(result.current.store.hasAnyPending()).toBe(false);
  });

  it('destroy clears optimistic state immediately', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      });
      complete();
    });

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeDefined();
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(4);
    });

    act(() => {
      result.current.store.destroy();
    });

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeUndefined();
      expect(result.current.store.hasPending(0, 1)).toBe(false);
    });
  });

  it('does not merge settled stale patch fields into a new mutation', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      });
      complete();
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(4);
    });

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
        },
      });
      complete();
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(1);
    });
  });

  it('clears completed border patch when worker value differs only by float noise', async () => {
    const initial = [makeAnnotation()];
    const { result, rerender } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      });
      complete();
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(2);
    });

    rerender({
      annotations: [makeAnnotation({ border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2.0006 } })],
    });

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeUndefined();
      expect(result.current.resolved[0]?.border?.borderWidth).toBeCloseTo(2.0006, 4);
    });
  });

  it('eventually clears completed border patch when worker value is materially different', async () => {
    const initial = [makeAnnotation()];
    const { result, rerender } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
      });
      complete();
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(4);
    });

    rerender({
      annotations: [makeAnnotation({ border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2.5 } })],
    });

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeDefined();
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(4);
    });

    await new Promise((resolve) => setTimeout(resolve, 1_650));

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeUndefined();
      expect(result.current.resolved[0]?.border?.borderWidth).toBe(2.5);
    });
  });

  it('applies and clears preview patches without marking mutation as pending', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.preview(0, 1, {
        colour: {
          stroke: { r: 0, g: 255, b: 0, a: 180 },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.store.getPreviewPatch(0, 1)).toEqual({
        colour: {
          stroke: { r: 0, g: 255, b: 0, a: 180 },
        },
      });
      expect(result.current.store.hasPending(0, 1)).toBe(false);
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 0, g: 255, b: 0, a: 180 });
    });

    act(() => {
      result.current.store.clearPreview(0, 1);
    });

    await waitFor(() => {
      expect(result.current.store.getPreviewPatch(0, 1)).toBeUndefined();
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    });
  });

  it('composes mutation and preview patches with preview taking precedence', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    let completeMutation: (() => void) | null = null;
    act(() => {
      completeMutation = result.current.store.begin(0, 1, {
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.current.store.hasPending(0, 1)).toBe(true);
    });

    act(() => {
      result.current.store.preview(0, 1, {
        colour: {
          stroke: { r: 0, g: 0, b: 255, a: 255 },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    });

    act(() => {
      result.current.store.clearPreview(0, 1);
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.colour.stroke).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    act(() => {
      completeMutation?.();
    });
  });

  it('applies preview line geometry for native line annotations', async () => {
    const initial = [
      makeAnnotation({
        type: AnnotationType.Line,
        line: {
          start: { x: 10, y: 40 },
          end: { x: 90, y: 12 },
        },
      }),
    ];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.preview(0, 1, {
        bounds: { left: 20, top: 60, right: 110, bottom: 18 },
        line: {
          start: { x: 20, y: 60 },
          end: { x: 110, y: 18 },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.bounds).toEqual({ left: 20, top: 60, right: 110, bottom: 18 });
      expect(result.current.resolved[0]?.line).toEqual({
        start: { x: 20, y: 60 },
        end: { x: 110, y: 18 },
      });
    });
  });

  it('applies preview ink-path geometry for line fallback annotations', async () => {
    const initial = [
      makeAnnotation({
        type: AnnotationType.Ink,
        lineFallback: true,
        inkPaths: [
          [
            { x: 10, y: 40 },
            { x: 90, y: 12 },
          ],
        ],
      }),
    ];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.preview(0, 1, {
        bounds: { left: 12, top: 44, right: 120, bottom: 10 },
        inkPaths: [
          [
            { x: 12, y: 44 },
            { x: 120, y: 10 },
          ],
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]?.bounds).toEqual({ left: 12, top: 44, right: 120, bottom: 10 });
      expect(result.current.resolved[0]?.inkPaths).toEqual([
        [
          { x: 12, y: 44 },
          { x: 120, y: 10 },
        ],
      ]);
    });
  });

  it('merges repeated pending mutations for the same annotation across all supported patch fields', async () => {
    const initial = [
      makeAnnotation({
        line: {
          start: { x: 10, y: 40 },
          end: { x: 90, y: 12 },
        },
        inkPaths: [
          [
            { x: 10, y: 40 },
            { x: 90, y: 12 },
          ],
        ],
      }),
    ];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.begin(0, 1, {
        bounds: { left: 12, top: 44, right: 100, bottom: 8 },
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
        },
        contents: 'draft',
        author: 'Alice',
        line: {
          start: { x: 12, y: 44 },
          end: { x: 100, y: 8 },
        },
      });
      result.current.store.begin(0, 1, {
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        colour: {
          interior: { r: 0, g: 255, b: 0, a: 180 },
        },
        subject: 'review',
        inkPaths: [
          [
            { x: 12, y: 44 },
            { x: 100, y: 8 },
          ],
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.resolved[0]).toMatchObject({
        bounds: { left: 12, top: 44, right: 100, bottom: 8 },
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
          interior: { r: 0, g: 255, b: 0, a: 180 },
        },
        contents: 'draft',
        author: 'Alice',
        subject: 'review',
        line: {
          start: { x: 12, y: 44 },
          end: { x: 100, y: 8 },
        },
        inkPaths: [
          [
            { x: 12, y: 44 },
            { x: 100, y: 8 },
          ],
        ],
      });
    });
  });

  it('merges successive preview patches for the same annotation', async () => {
    const initial = [makeAnnotation()];
    const { result } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      result.current.store.preview(0, 1, {
        bounds: { left: 20, top: 50, right: 95, bottom: 10 },
        contents: 'preview',
      });
      result.current.store.preview(0, 1, {
        colour: {
          stroke: { r: 12, g: 34, b: 56, a: 255 },
        },
        subject: 'merged preview',
      });
    });

    await waitFor(() => {
      expect(result.current.store.getPreviewPatch(0, 1)).toEqual({
        bounds: { left: 20, top: 50, right: 95, bottom: 10 },
        colour: {
          stroke: { r: 12, g: 34, b: 56, a: 255 },
        },
        contents: 'preview',
        subject: 'merged preview',
      });
      expect(result.current.resolved[0]).toMatchObject({
        bounds: { left: 20, top: 50, right: 95, bottom: 10 },
        colour: {
          stroke: { r: 12, g: 34, b: 56, a: 255 },
        },
        contents: 'preview',
        subject: 'merged preview',
      });
    });
  });

  it('acknowledges settled patches when all persisted fields match, including strings and geometry', async () => {
    const initial = [
      makeAnnotation({
        line: {
          start: { x: 10, y: 40 },
          end: { x: 90, y: 12 },
        },
        inkPaths: [
          [
            { x: 10, y: 40 },
            { x: 90, y: 12 },
          ],
        ],
      }),
    ];
    const { result, rerender } = renderHook(
      ({ annotations }) => {
        const store = useAnnotationMutationStore();
        const resolved = useResolvedEditorAnnotations(0, annotations);
        return { store, resolved };
      },
      { wrapper: Wrapper, initialProps: { annotations: initial as readonly SerialisedAnnotation[] } },
    );

    act(() => {
      const complete = result.current.store.begin(0, 1, {
        bounds: { left: 14, top: 46, right: 104, bottom: 6 },
        border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
        colour: {
          stroke: { r: 100, g: 10, b: 20, a: 255 },
          interior: { r: 50, g: 60, b: 70, a: 128 },
        },
        contents: 'persisted contents',
        author: 'Persisted Author',
        subject: 'Persisted Subject',
        line: {
          start: { x: 14, y: 46 },
          end: { x: 104, y: 6 },
        },
        inkPaths: [
          [
            { x: 14, y: 46 },
            { x: 104, y: 6 },
          ],
        ],
      });
      complete();
    });

    rerender({
      annotations: [
        makeAnnotation({
          bounds: { left: 14, top: 46, right: 104, bottom: 6 },
          border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
          colour: {
            stroke: { r: 100, g: 10, b: 20, a: 255 },
            interior: { r: 50, g: 60, b: 70, a: 128 },
          },
          contents: 'persisted contents',
          author: 'Persisted Author',
          subject: 'Persisted Subject',
          line: {
            start: { x: 14, y: 46 },
            end: { x: 104, y: 6 },
          },
          inkPaths: [
            [
              { x: 14, y: 46 },
              { x: 104, y: 6 },
            ],
          ],
        }),
      ],
    });

    await waitFor(() => {
      expect(result.current.store.getPatch(0, 1)).toBeUndefined();
      expect(result.current.resolved[0]).toMatchObject({
        contents: 'persisted contents',
        author: 'Persisted Author',
        subject: 'Persisted Subject',
      });
    });
  });
});
