import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedFormWidget } from '../../../../src/context/protocol.js';
import { FlattenFlags, FormFieldType, FormType, PageMode } from '../../../../src/core/types.js';

let currentDocument: { id: string } | null = { id: 'doc-1' };
let currentPageIndex = 0;
let widgetsData: SerialisedFormWidget[] = [];
let hasForm: boolean | undefined = true;

const killFocus = vi.fn<() => Promise<void>>();
const setHighlight =
  vi.fn<
    (fieldType: FormFieldType, colour: { r: number; g: number; b: number; a: number }, alpha: number) => Promise<void>
  >();
const undo = vi.fn<() => Promise<void>>();
const flatten = vi.fn<(flags: FlattenFlags) => Promise<'Success' | 'NothingToDo' | 'Fail'>>();

vi.mock('../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => ({
    viewer: {
      document: currentDocument,
      navigation: { pageIndex: currentPageIndex },
    },
  }),
}));

vi.mock('../../../../src/react/hooks/use-form-widgets.js', () => ({
  useFormWidgets: () => ({ data: widgetsData }),
}));

vi.mock('../../../../src/react/hooks/use-document-info.js', () => ({
  useDocumentInfo: () => ({
    data:
      hasForm === undefined
        ? undefined
        : {
            isTagged: false,
            hasForm,
            formType: FormType.AcroForm,
            namedDestinationCount: 0,
            pageMode: PageMode.UseNone,
          },
  }),
}));

vi.mock('../../../../src/react/hooks/use-document-form-actions.js', () => ({
  useDocumentFormActions: () => ({ killFocus, setHighlight }),
}));

vi.mock('../../../../src/react/hooks/use-page-form-actions.js', () => ({
  usePageFormActions: () => ({ undo, flatten }),
}));

const { useFormsPanelController } = await import('../../../../src/react/internal/use-forms-panel-controller.js');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useFormsPanelController', () => {
  beforeEach(() => {
    currentDocument = { id: 'doc-1' };
    currentPageIndex = 0;
    widgetsData = [];
    hasForm = true;
    killFocus.mockReset().mockResolvedValue(undefined);
    setHighlight.mockReset().mockResolvedValue(undefined);
    undo.mockReset().mockResolvedValue(undefined);
    flatten.mockReset().mockResolvedValue('Success');
    vi.useRealTimers();
  });

  it('returns widget/document values from dependent hooks', () => {
    widgetsData = [
      {
        annotationIndex: 1,
        fieldName: 'name',
        fieldType: FormFieldType.Unknown,
        fieldValue: 'Alice',
      },
    ];
    hasForm = false;

    const { result } = renderHook(() => useFormsPanelController());

    expect(result.current.widgets).toHaveLength(1);
    expect(result.current.hasForm).toBe(false);
    expect(result.current.selectedIndex).toBeNull();
    expect(result.current.formError).toBeNull();
  });

  it('returns early for highlight toggle when document is null', async () => {
    currentDocument = null;
    const { result } = renderHook(() => useFormsPanelController());

    act(() => {
      result.current.onHighlightToggle();
    });

    await Promise.resolve();
    expect(setHighlight).not.toHaveBeenCalled();
  });

  it('toggles highlight on and off using selected colour/alpha', async () => {
    const { result } = renderHook(() => useFormsPanelController());

    act(() => {
      result.current.onHighlightColourChange('#00FF7F');
      result.current.onHighlightAlphaChange(64);
    });

    act(() => {
      result.current.onHighlightToggle();
    });
    await waitFor(() => {
      expect(setHighlight).toHaveBeenCalledWith(FormFieldType.Unknown, { r: 0, g: 255, b: 127, a: 64 }, 64);
      expect(result.current.highlightEnabled).toBe(true);
    });

    act(() => {
      result.current.onHighlightToggle();
    });
    await waitFor(() => {
      expect(setHighlight).toHaveBeenLastCalledWith(FormFieldType.Unknown, { r: 0, g: 0, b: 0, a: 0 }, 0);
      expect(result.current.highlightEnabled).toBe(false);
    });
  });

  it('captures highlight/kill-focus/undo errors with fallback messages', async () => {
    const { result } = renderHook(() => useFormsPanelController());

    setHighlight.mockRejectedValueOnce('highlight-fail');
    act(() => {
      result.current.onHighlightToggle();
    });
    await waitFor(() => {
      expect(result.current.formError).toBe('Highlight toggle failed');
    });

    act(() => {
      result.current.onDismissError();
    });
    expect(result.current.formError).toBeNull();

    killFocus.mockRejectedValueOnce('kill-fail');
    act(() => {
      result.current.onKillFocus();
    });
    await waitFor(() => {
      expect(result.current.formError).toBe('Kill focus failed');
    });

    act(() => {
      result.current.onDismissError();
    });
    expect(result.current.formError).toBeNull();

    undo.mockRejectedValueOnce(new Error('Undo blew up'));
    act(() => {
      result.current.onUndo();
    });
    await waitFor(() => {
      expect(result.current.formError).toBe('Undo blew up');
    });
  });

  it('ignores stale async failures after lifecycle change', async () => {
    const killDeferred = deferred<void>();
    killFocus.mockReturnValueOnce(killDeferred.promise);
    const { result, rerender } = renderHook(() => useFormsPanelController());

    act(() => {
      result.current.onKillFocus();
    });

    act(() => {
      currentPageIndex = 1;
      rerender();
    });

    await act(async () => {
      killDeferred.reject(new Error('stale kill error'));
      await Promise.resolve();
    });

    expect(result.current.formError).toBeNull();
  });

  it('requires flatten confirmation, resolves success, and clears timer on lifecycle change', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useFormsPanelController());

    act(() => {
      result.current.onFlatten(FlattenFlags.Print);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.Print);
    expect(flatten).not.toHaveBeenCalled();

    act(() => {
      result.current.onFlatten(FlattenFlags.Print);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(flatten).toHaveBeenCalledWith(FlattenFlags.Print);
    expect(result.current.flattenResult).toBe('Success');

    act(() => {
      result.current.onFlatten(FlattenFlags.NormalDisplay);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.NormalDisplay);

    act(() => {
      currentPageIndex = 2;
      rerender();
      vi.advanceTimersByTime(3100);
    });

    expect(result.current.confirmingFlatten).toBeNull();
  });

  it('captures flatten errors and ignores stale flatten failures', async () => {
    const { result, rerender } = renderHook(() => useFormsPanelController());

    flatten.mockRejectedValueOnce(new Error('Flatten failed hard'));
    act(() => {
      result.current.onFlatten(FlattenFlags.Print);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.Print);
    act(() => {
      result.current.onFlatten(FlattenFlags.Print);
    });
    await waitFor(() => {
      expect(result.current.formError).toBe('Flatten failed hard');
    });

    act(() => {
      result.current.onDismissError();
    });
    expect(result.current.formError).toBeNull();

    const staleFlatten = deferred<'Success' | 'NothingToDo' | 'Fail'>();
    flatten.mockReturnValueOnce(staleFlatten.promise);

    act(() => {
      result.current.onFlatten(FlattenFlags.NormalDisplay);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.NormalDisplay);
    act(() => {
      result.current.onFlatten(FlattenFlags.NormalDisplay);
    });
    act(() => {
      currentPageIndex = 3;
      rerender();
    });
    await act(async () => {
      staleFlatten.reject(new Error('stale flatten error'));
      await Promise.resolve();
    });

    expect(result.current.formError).toBeNull();
  });

  it('replaces prior flatten confirmation timers without stale timeout clearing', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFormsPanelController());

    act(() => {
      result.current.onFlatten(FlattenFlags.Print);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.Print);

    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.onFlatten(FlattenFlags.NormalDisplay);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.NormalDisplay);

    // If the old timer was not cleared, this would incorrectly clear confirmation now.
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(result.current.confirmingFlatten).toBe(FlattenFlags.NormalDisplay);

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current.confirmingFlatten).toBeNull();
  });
});
