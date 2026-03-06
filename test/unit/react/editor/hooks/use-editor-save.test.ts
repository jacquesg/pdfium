import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorSave } from '../../../../../src/react/editor/hooks/use-editor-save.js';
import { createMockDocument } from '../../../../react-setup.js';

const mockMarkClean = vi.fn();
let mockIsDirty = false;
const mockWaitForIdle = vi.fn(async () => undefined);

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    isDirty: mockIsDirty,
    markClean: mockMarkClean,
  }),
}));

vi.mock('../../../../../src/react/editor/internal/annotation-mutation-store.js', () => ({
  useAnnotationMutationStore: () => ({
    waitForIdle: mockWaitForIdle,
  }),
}));

describe('useEditorSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDirty = false;
  });

  it('save returns null when document is null', async () => {
    const { result } = renderHook(() => useEditorSave(null));

    let returnValue: Uint8Array | null = new Uint8Array();
    await act(async () => {
      returnValue = await result.current.save();
    });

    expect(returnValue).toBeNull();
    expect(mockMarkClean).not.toHaveBeenCalled();
  });

  it('save calls document.save and markClean', async () => {
    const savedBytes = new Uint8Array([37, 80, 68, 70]);
    const mockDoc = createMockDocument({ save: vi.fn().mockResolvedValue(savedBytes) });

    const { result } = renderHook(() => useEditorSave(mockDoc as never));

    let returnValue: Uint8Array | null = null;
    await act(async () => {
      returnValue = await result.current.save();
    });

    expect(mockWaitForIdle).toHaveBeenCalledOnce();
    expect(mockDoc.save).toHaveBeenCalledOnce();
    expect(mockMarkClean).toHaveBeenCalledOnce();
    expect(returnValue).toBe(savedBytes);
  });

  it('isSaving is true during save operation', async () => {
    let resolveSave!: (value: Uint8Array) => void;
    const savePromise = new Promise<Uint8Array>((resolve) => {
      resolveSave = resolve;
    });
    const mockDoc = createMockDocument({ save: vi.fn().mockReturnValue(savePromise) });

    const { result } = renderHook(() => useEditorSave(mockDoc as never));

    expect(result.current.isSaving).toBe(false);

    let savePromiseResult: Promise<Uint8Array | null> | undefined;
    act(() => {
      savePromiseResult = result.current.save();
    });

    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      resolveSave(new Uint8Array([37, 80, 68, 70]));
      await savePromiseResult;
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('coalesces concurrent save calls into a single document.save operation', async () => {
    let resolveSave!: (value: Uint8Array) => void;
    const savePromise = new Promise<Uint8Array>((resolve) => {
      resolveSave = resolve;
    });
    const mockDoc = createMockDocument({ save: vi.fn().mockReturnValue(savePromise) });
    const { result } = renderHook(() => useEditorSave(mockDoc as never));

    let firstPromise: Promise<Uint8Array | null> | undefined;
    let secondPromise: Promise<Uint8Array | null> | undefined;
    act(() => {
      firstPromise = result.current.save();
      secondPromise = result.current.save();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockDoc.save).toHaveBeenCalledOnce();

    const savedBytes = new Uint8Array([37, 80, 68, 70]);
    await act(async () => {
      resolveSave(savedBytes);
      await Promise.all([firstPromise, secondPromise]);
    });

    expect(mockWaitForIdle).toHaveBeenCalledOnce();
    await expect(firstPromise).resolves.toBe(savedBytes);
    await expect(secondPromise).resolves.toBe(savedBytes);
    expect(mockMarkClean).toHaveBeenCalledOnce();
  });

  it('isDirty reflects editor state', () => {
    mockIsDirty = true;
    const { result } = renderHook(() => useEditorSave(null));

    expect(result.current.isDirty).toBe(true);
  });
});
