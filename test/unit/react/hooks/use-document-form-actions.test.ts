import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormFieldType } from '../../../../src/core/types.js';
import { useDocumentFormActions } from '../../../../src/react/hooks/use-document-form-actions.js';
import { createMockDocument } from '../../../react-setup.js';

const { mockBumpDocumentRevision } = vi.hoisted(() => ({
  mockBumpDocumentRevision: vi.fn(),
}));

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({
    documentRevision: 0,
    bumpDocumentRevision: mockBumpDocumentRevision,
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useDocumentFormActions', () => {
  it('returns killFocus and setHighlight functions', () => {
    const { result } = renderHook(() => useDocumentFormActions(null));

    expect(typeof result.current.killFocus).toBe('function');
    expect(typeof result.current.setHighlight).toBe('function');
  });

  it('killFocus returns false when document is null', async () => {
    const { result } = renderHook(() => useDocumentFormActions(null));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.killFocus();
    });

    expect(returnValue!).toBe(false);
  });

  it('killFocus calls document.killFormFocus and bumps revision', async () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDocumentFormActions(mockDoc as never));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.killFocus();
    });

    expect(mockDoc.killFormFocus).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalledOnce();
    expect(returnValue!).toBe(true);
  });

  it('setHighlight does nothing when document is null', async () => {
    const { result } = renderHook(() => useDocumentFormActions(null));

    await act(async () => {
      await result.current.setHighlight(FormFieldType.TextField, { r: 255, g: 255, b: 0, a: 255 }, 128);
    });

    // No error thrown — silent no-op
  });

  it('setHighlight calls document.setFormHighlight with correct arguments', async () => {
    const mockDoc = createMockDocument();
    const colour = { r: 255, g: 200, b: 0, a: 255 };
    const { result } = renderHook(() => useDocumentFormActions(mockDoc as never));

    await act(async () => {
      await result.current.setHighlight(FormFieldType.TextField, colour, 128);
    });

    expect(mockDoc.setFormHighlight).toHaveBeenCalledWith(FormFieldType.TextField, colour, 128);
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
  });

  it('does not bump revision when stale killFocus resolves after document switch', async () => {
    mockBumpDocumentRevision.mockClear();
    const staleKillFocus = deferred<boolean>();
    const staleDoc = createMockDocument({
      killFormFocus: vi.fn().mockReturnValue(staleKillFocus.promise),
    });
    const freshDoc = createMockDocument({
      killFormFocus: vi.fn().mockResolvedValue(true),
    });

    const { result, rerender } = renderHook(({ doc }) => useDocumentFormActions(doc), {
      initialProps: { doc: staleDoc as never },
    });

    let stalePromise!: Promise<boolean>;
    act(() => {
      stalePromise = result.current.killFocus();
    });

    rerender({ doc: freshDoc as never });

    await act(async () => {
      staleKillFocus.resolve(true);
      await stalePromise;
    });

    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.killFocus();
    });
    expect(mockBumpDocumentRevision).toHaveBeenCalledTimes(1);
  });

  it('does not bump revision when stale setHighlight resolves after document switch', async () => {
    mockBumpDocumentRevision.mockClear();
    const staleSetHighlight = deferred<void>();
    const staleDoc = createMockDocument({
      setFormHighlight: vi.fn().mockReturnValue(staleSetHighlight.promise),
    });
    const freshDoc = createMockDocument({
      setFormHighlight: vi.fn().mockResolvedValue(undefined),
    });
    const colour = { r: 255, g: 200, b: 0, a: 255 };

    const { result, rerender } = renderHook(({ doc }) => useDocumentFormActions(doc), {
      initialProps: { doc: staleDoc as never },
    });

    let stalePromise!: Promise<void>;
    act(() => {
      stalePromise = result.current.setHighlight(FormFieldType.TextField, colour, 100);
    });

    rerender({ doc: freshDoc as never });

    await act(async () => {
      staleSetHighlight.resolve();
      await stalePromise;
    });

    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.setHighlight(FormFieldType.TextField, colour, 128);
    });
    expect(mockBumpDocumentRevision).toHaveBeenCalledTimes(1);
  });

  it('no-ops stale callbacks invoked after unmount', async () => {
    mockBumpDocumentRevision.mockClear();
    const mockDoc = createMockDocument();
    const colour = { r: 1, g: 2, b: 3, a: 4 };
    const { result, unmount } = renderHook(() => useDocumentFormActions(mockDoc as never));

    const { killFocus, setHighlight } = result.current;
    unmount();

    let killFocusResult: boolean | undefined;
    await act(async () => {
      killFocusResult = await killFocus();
      await setHighlight(FormFieldType.TextField, colour, 100);
    });

    expect(killFocusResult).toBe(false);
    expect(mockDoc.killFormFocus).not.toHaveBeenCalled();
    expect(mockDoc.setFormHighlight).not.toHaveBeenCalled();
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
  });
});
