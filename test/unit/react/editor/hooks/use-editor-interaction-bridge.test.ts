import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorInteractionBridge } from '../../../../../src/react/editor/hooks/use-editor-interaction-bridge.js';
import type { EditorMode } from '../../../../../src/react/editor/types.js';
import type { InteractionMode } from '../../../../../src/react/hooks/use-interaction-mode.js';

const mockSetActiveTool = vi.fn<(tool: EditorMode) => void>();
const mockTriggerMarkupAction = vi.fn();
const mockClearPendingMarkupAction = vi.fn();

let mockActiveTool: EditorMode = 'idle';

vi.mock('../../../../../src/react/editor/context.js', () => ({
  useEditor: () => ({
    activeTool: mockActiveTool,
    setActiveTool: mockSetActiveTool,
    triggerMarkupAction: mockTriggerMarkupAction,
    clearPendingMarkupAction: mockClearPendingMarkupAction,
  }),
}));

describe('useEditorInteractionBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTool = 'idle';
    mockSetActiveTool.mockImplementation((tool) => {
      mockActiveTool = tool;
    });
    globalThis.document.body.innerHTML = '';
  });

  it('activating a drawing tool from non-pointer mode requests pointer mode first', () => {
    const setMode = vi.fn();
    const { result } = renderHook(() =>
      useEditorInteractionBridge({
        mode: 'pan',
        setMode,
      }),
    );

    act(() => {
      result.current.activate('rectangle');
    });

    expect(setMode).toHaveBeenCalledWith('pointer');
    expect(mockSetActiveTool).toHaveBeenCalledWith('rectangle');
  });

  it('markup activation is one-shot and keeps editor in idle mode', () => {
    const { result } = renderHook(() =>
      useEditorInteractionBridge({
        mode: 'pointer',
        setMode: vi.fn(),
      }),
    );

    act(() => {
      result.current.activate('highlight');
    });

    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
    expect(mockTriggerMarkupAction).toHaveBeenCalledWith('highlight');
  });

  it('viewer transition to non-pointer mode clears pending markup and forces idle tool', () => {
    mockActiveTool = 'line';
    const setMode = vi.fn();
    const { rerender } = renderHook(
      ({ mode }: { mode: InteractionMode }) =>
        useEditorInteractionBridge({
          mode,
          setMode,
        }),
      {
        initialProps: { mode: 'pointer' as InteractionMode },
      },
    );

    act(() => {
      rerender({ mode: 'pan' });
    });

    expect(mockClearPendingMarkupAction).toHaveBeenCalled();
    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
  });

  it('preserves explicit tool activation when pointer mode transition was bridge-requested', () => {
    const setMode = vi.fn();
    const { result, rerender } = renderHook(
      ({ mode }: { mode: InteractionMode }) =>
        useEditorInteractionBridge({
          mode,
          setMode,
        }),
      {
        initialProps: { mode: 'pan' as InteractionMode },
      },
    );

    act(() => {
      result.current.activate('circle');
    });

    mockSetActiveTool.mockClear();

    act(() => {
      rerender({ mode: 'pointer' });
    });

    expect(mockSetActiveTool).not.toHaveBeenCalledWith('idle');
  });

  it('select-text button click returns editor to idle mode', () => {
    mockActiveTool = 'rectangle';
    const button = globalThis.document.createElement('button');
    button.setAttribute('data-testid', 'select-text');
    globalThis.document.body.append(button);

    renderHook(() =>
      useEditorInteractionBridge(
        {
          mode: 'pointer',
          setMode: vi.fn(),
        },
        { selectTextButtonSelector: '[data-testid="select-text"]' },
      ),
    );

    act(() => {
      button.click();
    });

    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
  });

  it('pointer shortcut returns editor to idle only while viewer is in pointer mode', () => {
    mockActiveTool = 'ink';
    const setMode = vi.fn();
    const { rerender } = renderHook(
      ({ mode }: { mode: InteractionMode }) =>
        useEditorInteractionBridge({
          mode,
          setMode,
        }),
      {
        initialProps: { mode: 'pointer' as InteractionMode },
      },
    );

    act(() => {
      globalThis.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
    });
    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');

    mockSetActiveTool.mockClear();
    mockActiveTool = 'ink';
    act(() => {
      rerender({ mode: 'pan' });
    });
    mockSetActiveTool.mockClear();
    act(() => {
      globalThis.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
    });
    expect(mockSetActiveTool).not.toHaveBeenCalledWith('idle');
  });

  it('Escape returns editor to idle unless focus is inside an editable control', () => {
    mockActiveTool = 'line';
    renderHook(() =>
      useEditorInteractionBridge({
        mode: 'pointer',
        setMode: vi.fn(),
      }),
    );

    act(() => {
      globalThis.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
    expect(mockClearPendingMarkupAction).toHaveBeenCalled();

    mockSetActiveTool.mockClear();
    mockClearPendingMarkupAction.mockClear();
    mockActiveTool = 'line';

    const input = globalThis.document.createElement('input');
    globalThis.document.body.append(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(mockSetActiveTool).not.toHaveBeenCalled();
    expect(mockClearPendingMarkupAction).not.toHaveBeenCalled();
  });

  it('Escape still resets the active tool when another listener already prevented default', () => {
    mockActiveTool = 'rectangle';
    renderHook(() =>
      useEditorInteractionBridge({
        mode: 'pointer',
        setMode: vi.fn(),
      }),
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => {
      globalThis.document.dispatchEvent(event);
    });

    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
  });

  it('pointer shortcut still resets active tool when another listener already prevented default', () => {
    mockActiveTool = 'ink';
    renderHook(() =>
      useEditorInteractionBridge({
        mode: 'pointer',
        setMode: vi.fn(),
      }),
    );

    const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => {
      globalThis.document.dispatchEvent(event);
    });

    expect(mockSetActiveTool).toHaveBeenCalledWith('idle');
  });
});
