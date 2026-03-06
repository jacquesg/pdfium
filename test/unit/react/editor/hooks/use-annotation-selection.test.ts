import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationType } from '../../../../../src/core/types.js';
import { useAnnotationSelection } from '../../../../../src/react/editor/hooks/use-annotation-selection.js';

const mockSetSelection = vi.fn();
let mockSelection: { pageIndex: number; annotationIndex: number } | null = null;

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    selection: mockSelection,
    setSelection: mockSetSelection,
  }),
}));

function makeAnnotation(index = 0) {
  return {
    index,
    type: AnnotationType.Square,
    bounds: { left: 0, top: 100, right: 100, bottom: 0 },
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
}

describe('useAnnotationSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelection = null;
  });

  it('returns selection from editor context', () => {
    mockSelection = { pageIndex: 1, annotationIndex: 2 };
    const { result } = renderHook(() => useAnnotationSelection());

    expect(result.current.selection).toEqual({ pageIndex: 1, annotationIndex: 2 });
  });

  it('select sets selection with page and annotation index', () => {
    mockSelection = null;
    const { result } = renderHook(() => useAnnotationSelection());

    act(() => {
      result.current.select(3, 7);
    });

    expect(mockSetSelection).toHaveBeenCalledWith({ pageIndex: 3, annotationIndex: 7 });
  });

  it('select clears native browser text selection before selecting the annotation', () => {
    const removeAllRanges = vi.fn();
    const getSelectionSpy = vi.spyOn(globalThis, 'getSelection').mockReturnValue({
      rangeCount: 1,
      removeAllRanges,
    } as unknown as Selection);
    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
    const { result } = renderHook(() => useAnnotationSelection());

    act(() => {
      result.current.select(3, 7);
    });

    expect(removeAllRanges).toHaveBeenCalledTimes(2);
    expect(mockSetSelection).toHaveBeenCalledWith({ pageIndex: 3, annotationIndex: 7 });

    requestAnimationFrameSpy.mockRestore();
    getSelectionSpy.mockRestore();
  });

  it('clearSelection sets selection to null', () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const { result } = renderHook(() => useAnnotationSelection());

    act(() => {
      result.current.clearSelection();
    });

    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Escape key clears selection', () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    renderHook(() => useAnnotationSelection());

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Escape key does nothing when selection belongs to a different page overlay', () => {
    mockSelection = { pageIndex: 1, annotationIndex: 0 };
    renderHook(() => useAnnotationSelection(undefined, undefined, 0));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('Delete key removes selected annotation and clears selection', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 1, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [annotation]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(mockRemoveAnnotation).toHaveBeenCalledWith(0, annotation);
    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Backspace key removes selected annotation and clears selection', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [annotation]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(mockRemoveAnnotation).toHaveBeenCalledWith(0, annotation);
    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Delete resolves by PDF annotation index, not array position', async () => {
    const annotation = makeAnnotation(5);
    mockSelection = { pageIndex: 0, annotationIndex: 5 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [annotation]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(mockRemoveAnnotation).toHaveBeenCalledWith(5, annotation);
    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Delete key does nothing when selection belongs to a different page overlay', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 1, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [annotation], 0));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('Delete key removes selected annotation when page index matches the current overlay', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 1, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [annotation], 1));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(mockRemoveAnnotation).toHaveBeenCalledWith(0, annotation);
    expect(mockSetSelection).toHaveBeenCalledWith(null);
  });

  it('Delete key does nothing without selection', async () => {
    mockSelection = null;
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;

    renderHook(() => useAnnotationSelection(crud, [makeAnnotation()]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
  });

  it('Delete key does nothing without crud actions', async () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };

    renderHook(() => useAnnotationSelection(undefined, [makeAnnotation()]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    // setSelection not called for delete (only called if crud present)
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not delete annotation when Backspace is pressed in a text input', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;
    renderHook(() => useAnnotationSelection(crud, [annotation]));

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
      });
    } finally {
      input.remove();
    }

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not delete annotation when Delete is pressed in a textarea', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;
    renderHook(() => useAnnotationSelection(crud, [annotation]));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    try {
      await act(async () => {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
      });
    } finally {
      textarea.remove();
    }

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not clear selection on Escape while editing a field', () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    renderHook(() => useAnnotationSelection());

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
    } finally {
      input.remove();
    }

    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not clear selection on Escape from a contenteditable descendant', () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    renderHook(() => useAnnotationSelection());

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editable.appendChild(child);
    document.body.appendChild(editable);
    try {
      act(() => {
        child.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
    } finally {
      editable.remove();
    }

    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not clear selection on Escape from contenteditable="plaintext-only"', () => {
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    renderHook(() => useAnnotationSelection());

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'plaintext-only');
    const child = document.createElement('span');
    editable.appendChild(child);
    document.body.appendChild(editable);
    try {
      act(() => {
        child.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
    } finally {
      editable.remove();
    }

    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not delete annotation when keydown event is already defaultPrevented', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;
    renderHook(() => useAnnotationSelection(crud, [annotation]));

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    event.preventDefault();
    await act(async () => {
      document.dispatchEvent(event);
    });

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not delete annotation on modified Delete shortcut (ctrl/meta/alt)', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;
    renderHook(() => useAnnotationSelection(crud, [annotation]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', metaKey: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', altKey: true }));
    });

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('does not delete annotation on auto-repeated Delete keydown', async () => {
    const annotation = makeAnnotation(0);
    mockSelection = { pageIndex: 0, annotationIndex: 0 };
    const mockRemoveAnnotation = vi.fn().mockResolvedValue(undefined);
    const crud = { removeAnnotation: mockRemoveAnnotation } as never;
    renderHook(() => useAnnotationSelection(crud, [annotation]));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', repeat: true }));
    });

    expect(mockRemoveAnnotation).not.toHaveBeenCalled();
    expect(mockSetSelection).not.toHaveBeenCalled();
  });
});
