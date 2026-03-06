import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../../src/core/types.js';
import { ApplyRedactionsCommand } from '../../../../../src/react/editor/command.js';
import type { AnnotationCrudActions } from '../../../../../src/react/editor/hooks/use-annotation-crud.js';
import { useRedaction } from '../../../../../src/react/editor/hooks/use-redaction.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../../../../../src/react/editor/redaction-utils.js';
import { createMockDocument, createMockPage } from '../../../../react-setup.js';

const mockBumpPageRevision = vi.fn();
const mockCommandPush = vi.fn().mockResolvedValue(undefined);
const mockOpenDocument = vi.fn();
const mockInstance = { openDocument: mockOpenDocument };
let currentInstance: { openDocument: typeof mockOpenDocument } | null = mockInstance;

vi.mock('../../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({
    documentRevision: 0,
    pageRevisionVersion: 0,
    bumpDocumentRevision: vi.fn(),
    bumpPageRevision: mockBumpPageRevision,
    getPageRevision: vi.fn(() => 0),
  }),
  usePDFiumInstance: () => ({
    instance: currentInstance,
  }),
}));

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    commandStack: {
      push: mockCommandPush,
    },
  }),
}));

function createMockCrud(): AnnotationCrudActions {
  return {
    createAnnotation: vi.fn().mockResolvedValue(0),
    removeAnnotation: vi.fn().mockResolvedValue(undefined),
    moveAnnotation: vi.fn().mockResolvedValue(undefined),
    resizeAnnotation: vi.fn().mockResolvedValue(undefined),
    setAnnotationColour: vi.fn().mockResolvedValue(undefined),
    setAnnotationBorder: vi.fn().mockResolvedValue(undefined),
    setAnnotationString: vi.fn().mockResolvedValue(undefined),
    replaceLineFallback: vi.fn().mockResolvedValue(undefined),
  };
}

function makeAnnotation(type: AnnotationType, overrides?: Partial<SerialisedAnnotation>): SerialisedAnnotation {
  return {
    index: 0,
    type,
    bounds: { left: 0, top: 10, right: 10, bottom: 0 },
    colour: { stroke: undefined, interior: undefined },
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
    ...overrides,
  };
}

describe('useRedaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentInstance = mockInstance;
  });

  it('markRedaction creates Redact annotation via crud', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, null));

    const rect = { left: 10, top: 20, right: 200, bottom: 80 };
    let returnValue: number | undefined;
    await act(async () => {
      returnValue = await result.current.markRedaction(rect);
    });

    expect(crud.createAnnotation).toHaveBeenCalledWith(AnnotationType.Redact, rect, undefined);
    expect(returnValue).toBe(0);
  });

  it('markRedaction passes options through to createAnnotation', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, null));

    const rect = { left: 10, top: 20, right: 200, bottom: 80 };
    const options = { colour: { r: 255, g: 0, b: 0, a: 255 } };
    await act(async () => {
      await result.current.markRedaction(rect, options);
    });

    expect(crud.createAnnotation).toHaveBeenCalledWith(AnnotationType.Redact, rect, options);
  });

  it('markRedaction falls back to pseudo-redaction square when Redact is unsupported', async () => {
    const crud = createMockCrud();
    const unsupportedError = new Error('Failed to create annotation of type Redact');
    vi.mocked(crud.createAnnotation).mockRejectedValueOnce(unsupportedError).mockResolvedValueOnce(7);
    const { result } = renderHook(() => useRedaction(crud, null));

    const rect = { left: 10, top: 20, right: 200, bottom: 80 };
    const colour = { r: 20, g: 30, b: 40, a: 200 };

    let createdIndex: number | undefined;
    await act(async () => {
      createdIndex = await result.current.markRedaction(rect, { colour });
    });

    expect(crud.createAnnotation).toHaveBeenNthCalledWith(1, AnnotationType.Redact, rect, { colour });
    expect(crud.createAnnotation).toHaveBeenNthCalledWith(2, AnnotationType.Square, rect, {
      contents: REDACTION_FALLBACK_CONTENTS_MARKER,
      strokeColour: colour,
      interiorColour: colour,
    });
    expect(createdIndex).toBe(7);
  });

  it('applyRedactions applies redactions on the page', async () => {
    const mockPage = createMockPage({
      getAnnotations: vi.fn().mockResolvedValue([makeAnnotation(AnnotationType.Redact)]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();

    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    await act(async () => {
      await result.current.applyRedactions(1);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    expect(mockCommandPush).toHaveBeenCalledWith(expect.any(ApplyRedactionsCommand));
    expect(mockBumpPageRevision).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(1);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('applyRedactions applies pseudo-redaction fallback annotations in alpha mode', async () => {
    const mockPage = createMockPage({
      getAnnotations: vi
        .fn()
        .mockResolvedValue([makeAnnotation(AnnotationType.Square, { contents: REDACTION_FALLBACK_CONTENTS_MARKER })]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    await act(async () => {
      await result.current.applyRedactions(0);
    });
    expect(mockCommandPush).toHaveBeenCalledWith(expect.any(ApplyRedactionsCommand));
    expect(mockBumpPageRevision).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
  });

  it('applyRedactions applies pages with mixed annotation types', async () => {
    const mockPage = createMockPage({
      getAnnotations: vi
        .fn()
        .mockResolvedValue([makeAnnotation(AnnotationType.Redact), makeAnnotation(AnnotationType.Square)]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    await act(async () => {
      await result.current.applyRedactions(0);
    });
    expect(mockCommandPush).toHaveBeenCalledWith(expect.any(ApplyRedactionsCommand));
    expect(mockBumpPageRevision).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
  });

  it('applyRedactions returns early for null document', async () => {
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, null));

    await act(async () => {
      await result.current.applyRedactions(0);
    });

    expect(mockBumpPageRevision).not.toHaveBeenCalled();
    expect(mockCommandPush).not.toHaveBeenCalled();
  });

  it('applyRedactions returns early when no marked redactions exist', async () => {
    const mockPage = createMockPage({
      getAnnotations: vi.fn().mockResolvedValue([makeAnnotation(AnnotationType.Square)]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    await act(async () => {
      await result.current.applyRedactions(0);
    });

    expect(mockCommandPush).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('applyRedactions returns early when worker instance is missing', async () => {
    currentInstance = null;
    const mockPage = createMockPage({
      getAnnotations: vi.fn().mockResolvedValue([makeAnnotation(AnnotationType.Redact)]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    await act(async () => {
      await result.current.applyRedactions(0);
    });

    expect(mockCommandPush).not.toHaveBeenCalled();
    expect(mockBumpPageRevision).not.toHaveBeenCalled();
  });

  it('applyRedactions ignores re-entrant calls while an apply is in progress', async () => {
    let resolvePush: (() => void) | undefined;
    const pendingPush = new Promise<void>((resolve) => {
      resolvePush = resolve;
    });
    mockCommandPush.mockImplementationOnce(() => pendingPush);

    const mockPage = createMockPage({
      getAnnotations: vi.fn().mockResolvedValue([makeAnnotation(AnnotationType.Redact)]),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const crud = createMockCrud();
    const { result } = renderHook(() => useRedaction(crud, mockDoc as never));

    const first = result.current.applyRedactions(0);
    const second = result.current.applyRedactions(0);

    await vi.waitFor(() => {
      expect(mockCommandPush).toHaveBeenCalledTimes(1);
    });
    resolvePush?.();
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(mockDoc.getPage).toHaveBeenCalledTimes(1);
    expect(mockBumpPageRevision).toHaveBeenCalledOnce();
    expect(mockBumpPageRevision).toHaveBeenCalledWith(0);
  });
});
