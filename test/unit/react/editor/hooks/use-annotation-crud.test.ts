import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import { CommandStack } from '../../../../../src/react/editor/command.js';
import { useAnnotationCrud } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';
import { createMockDocument, createMockPage } from '../../../../react-setup.js';

const mockBumpPageRevision = vi.fn();
const mockCommandStack = new CommandStack();
const mockBeginAnnotationMutation = vi.fn().mockReturnValue(vi.fn());
const mockClearAnnotationMutation = vi.fn();
const mockOpenDocument = vi.fn();
const mockAnnotationMutationStore = {
  begin: mockBeginAnnotationMutation,
  clear: mockClearAnnotationMutation,
};
const mockPDFiumDocumentContext = {
  documentRevision: 0,
  pageRevisionVersion: 0,
  bumpDocumentRevision: vi.fn(),
  bumpPageRevision: mockBumpPageRevision,
  getPageRevision: vi.fn(() => 0),
};
const mockPDFiumInstanceContext = {
  instance: {
    openDocument: mockOpenDocument,
  },
};
const mockEditorContext = {
  commandStack: mockCommandStack,
};

vi.mock('../../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => mockPDFiumDocumentContext,
  usePDFiumInstance: () => mockPDFiumInstanceContext,
}));

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => mockEditorContext,
}));

vi.mock('../../../../../src/react/editor/internal/annotation-mutation-store.js', () => ({
  useAnnotationMutationStore: () => mockAnnotationMutationStore,
}));

function createAnnotationMockPage() {
  return createMockPage({
    createAnnotation: vi.fn().mockResolvedValue({
      index: 0,
      type: AnnotationType.Square,
      bounds: { left: 10, top: 20, right: 110, bottom: 120 },
      colour: { stroke: undefined, interior: undefined },
      flags: 4,
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
    }),
    removeAnnotation: vi.fn().mockResolvedValue(true),
    setAnnotationRect: vi.fn().mockResolvedValue(true),
    setAnnotationColour: vi.fn().mockResolvedValue(true),
    setAnnotationBorder: vi.fn().mockResolvedValue(true),
    setAnnotationString: vi.fn().mockResolvedValue(true),
    generateContent: vi.fn().mockResolvedValue(true),
    [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
  });
}

describe('useAnnotationCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommandStack.clear();
  });

  it('returns all CRUD actions', () => {
    const { result } = renderHook(() => useAnnotationCrud(null, 0));

    expect(typeof result.current.createAnnotation).toBe('function');
    expect(typeof result.current.removeAnnotation).toBe('function');
    expect(typeof result.current.moveAnnotation).toBe('function');
    expect(typeof result.current.resizeAnnotation).toBe('function');
    expect(typeof result.current.setAnnotationColour).toBe('function');
    expect(typeof result.current.setAnnotationBorder).toBe('function');
    expect(typeof result.current.setAnnotationStyle).toBe('function');
    expect(typeof result.current.setAnnotationString).toBe('function');
    expect(typeof result.current.replaceLineFallback).toBe('function');
  });

  it('returns a stable action object when inputs are unchanged', () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result, rerender } = renderHook(
      ({ document, pageIndex }: { document: typeof mockDoc; pageIndex: number }) =>
        useAnnotationCrud(document as never, pageIndex),
      {
        initialProps: { document: mockDoc, pageIndex: 0 },
      },
    );

    const firstResult = result.current;
    rerender({ document: mockDoc, pageIndex: 0 });

    expect(result.current).toBe(firstResult);
  });

  it('createAnnotation returns undefined when document is null', async () => {
    const { result } = renderHook(() => useAnnotationCrud(null, 0));

    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.createAnnotation(AnnotationType.Square, {
        left: 10,
        top: 20,
        right: 110,
        bottom: 120,
      });
    });

    expect(returnValue).toBeUndefined();
  });

  it('createAnnotation pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 2));

    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.createAnnotation(AnnotationType.Square, {
        left: 10,
        top: 20,
        right: 110,
        bottom: 120,
      });
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(2);
    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(2);
    // Page is disposed by the command's withPage helper, not the CRUD hook
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
    expect(returnValue).toBe(0);
  });

  it('removeAnnotation pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 1));

    const snapshot = {
      index: 3,
      type: AnnotationType.Square,
      bounds: { left: 10, top: 20, right: 110, bottom: 120 },
      colour: { stroke: undefined, interior: undefined },
      flags: 4,
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
    };

    await act(async () => {
      await result.current.removeAnnotation(3, snapshot);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(1);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('moveAnnotation pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const oldRect = { left: 10, top: 20, right: 110, bottom: 120 };
    const newRect = { left: 50, top: 60, right: 150, bottom: 160 };

    await act(async () => {
      await result.current.moveAnnotation(0, oldRect, newRect);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('moveAnnotation no-ops when rect is unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));
    const sameRect = { left: 10, top: 20, right: 110, bottom: 120 };

    await act(async () => {
      await result.current.moveAnnotation(0, sameRect, sameRect);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('resizeAnnotation pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const oldRect = { left: 10, top: 20, right: 110, bottom: 120 };
    const newRect = { left: 10, top: 20, right: 200, bottom: 200 };

    await act(async () => {
      await result.current.resizeAnnotation(0, oldRect, newRect);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('resizeAnnotation no-ops when rect is unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));
    const sameRect = { left: 10, top: 20, right: 110, bottom: 120 };

    await act(async () => {
      await result.current.resizeAnnotation(0, sameRect, sameRect);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('setAnnotationColour pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const oldColour = { r: 0, g: 0, b: 0, a: 255 };
    const newColour = { r: 255, g: 0, b: 0, a: 255 };

    await act(async () => {
      await result.current.setAnnotationColour(0, 'stroke', oldColour, newColour);
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('setAnnotationColour no-ops when colour is unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));
    const sameColour = { r: 10, g: 20, b: 30, a: 255 };

    await act(async () => {
      await result.current.setAnnotationColour(0, 'stroke', sameColour, sameColour);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('setAnnotationString pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationString(0, 'Contents', 'old text', 'new text');
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('setAnnotationString no-ops when value is unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationString(0, 'Contents', 'same', 'same');
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('setAnnotationString uses optimistic author patch for T', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationString(0, 'T', 'John Doe', 'Jane Doe');
    });

    expect(mockBeginAnnotationMutation).toHaveBeenCalledWith(0, 0, { author: 'Jane Doe' });
  });

  it('setAnnotationString uses optimistic subject patch for Subj', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationString(0, 'Subj', 'Old subject', 'New subject');
    });

    expect(mockBeginAnnotationMutation).toHaveBeenCalledWith(0, 0, { subject: 'New subject' });
  });

  it('setAnnotationString skips optimistic mutation for unsupported string keys', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationString(0, 'Name', 'Old', 'Approved');
    });

    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
  });

  it('setAnnotationBorder pushes command, bumps revision, and disposes page via command', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationBorder(
        0,
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 },
        { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
      );
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('setAnnotationBorder no-ops when border is unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));
    const sameBorder = { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 };

    await act(async () => {
      await result.current.setAnnotationBorder(0, sameBorder, sameBorder);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('setAnnotationStyle pushes one command and bumps revision once for combined style edits', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationStyle?.(0, {
        stroke: {
          colourType: 'stroke',
          oldColour: { r: 0, g: 0, b: 0, a: 255 },
          newColour: { r: 10, g: 20, b: 30, a: 200 },
          preserveBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
        },
        border: {
          oldBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
          newBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 4 },
        },
      });
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
  });

  it('setAnnotationStyle no-ops when all style values are unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await act(async () => {
      await result.current.setAnnotationStyle?.(0, {
        stroke: {
          colourType: 'stroke',
          oldColour: { r: 10, g: 20, b: 30, a: 255 },
          newColour: { r: 10, g: 20, b: 30, a: 255 },
        },
        border: {
          oldBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
          newBorder: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 3 },
        },
      });
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockBeginAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('warns on the second and fifth rapid style mutation in development', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(100);
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    try {
      for (let index = 0; index < 5; index += 1) {
        await act(async () => {
          await result.current.setAnnotationColour(
            0,
            'stroke',
            { r: index, g: 0, b: 0, a: 255 },
            { r: index + 1, g: 0, b: 0, a: 255 },
          );
        });
      }

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('Rapid colour mutation burst detected');
    } finally {
      warnSpy.mockRestore();
      nowSpy.mockRestore();
    }
  });

  it('replaceLineFallback pushes command, bumps revision, and returns new index', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const snapshot = {
      index: 0,
      type: AnnotationType.Ink,
      bounds: { left: 10, top: 100, right: 90, bottom: 20 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 4,
      contents: '',
      author: '',
      subject: '',
      border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      appearance: null,
      fontSize: 0,
      lineFallback: true,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 10, y: 20 },
          { x: 90, y: 100 },
        ],
      ],
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    let createdIndex: number | undefined;
    await act(async () => {
      createdIndex = await result.current.replaceLineFallback(
        snapshot,
        { left: 20, top: 110, right: 100, bottom: 30 },
        { x: 20, y: 30 },
        { x: 100, y: 110 },
        { r: 0, g: 0, b: 0, a: 255 },
        2,
      );
    });

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalled();
    expect(mockPage[Symbol.asyncDispose]).toHaveBeenCalled();
    expect(createdIndex).toBe(0);
  });

  it('replaceLineFallback no-ops when geometry and style are unchanged', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const pushSpy = vi.spyOn(mockCommandStack, 'push');

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const snapshot = {
      index: 7,
      type: AnnotationType.Ink,
      bounds: { left: 20, top: 110, right: 100, bottom: 30 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 4,
      contents: '',
      author: '',
      subject: '',
      border: { horizontalRadius: 0, verticalRadius: 0, borderWidth: 2 },
      appearance: null,
      fontSize: 0,
      lineFallback: true,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 20, y: 30 },
          { x: 100, y: 110 },
        ],
      ],
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    let createdIndex: number | undefined;
    await act(async () => {
      createdIndex = await result.current.replaceLineFallback(
        snapshot,
        snapshot.bounds,
        { x: 20, y: 30 },
        { x: 100, y: 110 },
        { r: 0, g: 0, b: 0, a: 255 },
        2,
      );
    });

    expect(createdIndex).toBe(7);
    expect(pushSpy).not.toHaveBeenCalled();
    expect(mockClearAnnotationMutation).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('replaceLineFallback normalises non-finite stroke width to 1', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const snapshot = {
      index: 3,
      type: AnnotationType.Ink,
      bounds: { left: 0, top: 100, right: 50, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      lineFallback: true,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 0, y: 100 },
          { x: 50, y: 0 },
        ],
      ],
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    await act(async () => {
      await result.current.replaceLineFallback(
        snapshot,
        { left: 0, top: 100, right: 100, bottom: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 0 },
        { r: 0, g: 0, b: 0, a: 255 },
        Number.NaN,
      );
    });

    expect(mockPage.setAnnotationBorder).toHaveBeenCalledWith(0, 0, 0, 1);
  });

  it('replaceLineFallback normalises tiny stroke width to 0.25', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    const snapshot = {
      index: 4,
      type: AnnotationType.Ink,
      bounds: { left: 0, top: 100, right: 50, bottom: 0 },
      colour: { stroke: { r: 0, g: 0, b: 0, a: 255 }, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      lineFallback: true,
      line: undefined,
      vertices: undefined,
      inkPaths: [
        [
          { x: 0, y: 100 },
          { x: 50, y: 0 },
        ],
      ],
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    };

    await act(async () => {
      await result.current.replaceLineFallback(
        snapshot,
        { left: 0, top: 100, right: 100, bottom: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 0 },
        { r: 0, g: 0, b: 0, a: 255 },
        0.1,
      );
    });

    expect(mockPage.setAnnotationBorder).toHaveBeenCalledWith(0, 0, 0, 0.25);
  });

  it('does not bump revision when command push throws', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    vi.spyOn(mockCommandStack, 'push').mockRejectedValueOnce(new Error('push failed'));
    mockBumpPageRevision.mockClear();

    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    let caughtError: Error | undefined;
    await act(async () => {
      try {
        await result.current.moveAnnotation(
          0,
          { left: 0, top: 0, right: 100, bottom: 100 },
          { left: 10, top: 10, right: 110, bottom: 110 },
        );
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toBe('push failed');
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('removeAnnotation returns early when document is null', async () => {
    const { result } = renderHook(() => useAnnotationCrud(null, 0));

    await act(async () => {
      await result.current.removeAnnotation(0, {
        index: 0,
        type: AnnotationType.Square,
        bounds: { left: 0, top: 0, right: 100, bottom: 100 },
        colour: { stroke: undefined, interior: undefined },
        flags: 4,
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
      });
    });

    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('clears optimistic state when a colour mutation command fails', async () => {
    const mockPage = createAnnotationMockPage();
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    vi.spyOn(mockCommandStack, 'push').mockRejectedValueOnce(new Error('push failed'));
    const { result } = renderHook(() => useAnnotationCrud(mockDoc as never, 0));

    await expect(
      act(async () => {
        await result.current.setAnnotationColour(
          0,
          'stroke',
          { r: 0, g: 0, b: 0, a: 255 },
          { r: 255, g: 0, b: 0, a: 255 },
        );
      }),
    ).rejects.toThrow('push failed');

    expect(mockBeginAnnotationMutation).toHaveBeenCalledWith(0, 0, {
      colour: {
        stroke: { r: 255, g: 0, b: 0, a: 255 },
      },
    });
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });
});
