import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorDirtyState } from '../../../../../src/react/editor/hooks/use-editor-dirty-state.js';

const mockMarkClean = vi.fn();
let mockIsDirty = false;

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    isDirty: mockIsDirty,
    markClean: mockMarkClean,
  }),
}));

describe('useEditorDirtyState', () => {
  it('returns isDirty from editor context', () => {
    mockIsDirty = true;
    const { result } = renderHook(() => useEditorDirtyState());

    expect(result.current.isDirty).toBe(true);
  });

  it('markClean delegates to editor context', () => {
    mockIsDirty = false;
    const { result } = renderHook(() => useEditorDirtyState());

    act(() => {
      result.current.markClean();
    });

    expect(mockMarkClean).toHaveBeenCalledOnce();
  });
});
