import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorTool } from '../../../../../src/react/editor/hooks/use-editor-tool.js';

const mockSetActiveTool = vi.fn();
let mockActiveTool = 'idle';

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    activeTool: mockActiveTool,
    setActiveTool: mockSetActiveTool,
  }),
}));

describe('useEditorTool', () => {
  it('returns the active tool from editor context', () => {
    mockActiveTool = 'rectangle';
    const { result } = renderHook(() => useEditorTool());

    expect(result.current.activeTool).toBe('rectangle');
  });

  it('setTool delegates to setActiveTool', () => {
    mockActiveTool = 'idle';
    const { result } = renderHook(() => useEditorTool());

    act(() => {
      result.current.setTool('ink');
    });

    expect(mockSetActiveTool).toHaveBeenCalledWith('ink');
  });
});
