/**
 * Unit tests for EditorProvider and useEditor hook.
 *
 * Mocks usePDFiumDocument to avoid requiring a real PDFiumProvider tree.
 */

import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock usePDFiumDocument ────────────────────────────────────
const mockBumpDocumentRevision = vi.fn();
const mockPDFiumDocumentContext = {
  document: null as { id: string } | null,
  documentName: null,
  documentRevision: 0,
  pageRevisionVersion: 0,
  error: null,
  isInitialising: false,
  password: {
    required: false,
    attempted: false,
    error: null,
    submit: vi.fn(async () => undefined),
    cancel: vi.fn(),
  },
  bumpDocumentRevision: mockBumpDocumentRevision,
  bumpPageRevision: vi.fn(),
  getPageRevision: vi.fn(() => 0),
  invalidateCache: vi.fn(),
  loadDocument: vi.fn(async () => undefined),
  loadDocumentFromUrl: vi.fn(async () => undefined),
};

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn(() => mockPDFiumDocumentContext),
}));

// Import after mock is established
const { EditorProvider, useEditor } = await import('../../../../src/react/editor/context.js');
const { useAnnotationMutationStore } = await import(
  '../../../../src/react/editor/internal/annotation-mutation-store.js'
);

// ── Test helpers ─────────────────────────────────────────────

function createWrapper(props?: Omit<Parameters<typeof EditorProvider>[0], 'children'>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(EditorProvider, { ...props, children });
  };
}

function makeMockCommand() {
  return {
    description: 'test command',
    execute: vi.fn().mockResolvedValue(undefined),
    undo: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('EditorProvider + useEditor', () => {
  beforeEach(() => {
    mockBumpDocumentRevision.mockClear();
    mockPDFiumDocumentContext.document = null;
    mockPDFiumDocumentContext.documentName = null;
    mockPDFiumDocumentContext.documentRevision = 0;
    mockPDFiumDocumentContext.pageRevisionVersion = 0;
    mockPDFiumDocumentContext.error = null;
    mockPDFiumDocumentContext.isInitialising = false;
    mockPDFiumDocumentContext.bumpPageRevision.mockClear();
    mockPDFiumDocumentContext.getPageRevision.mockClear();
    mockPDFiumDocumentContext.invalidateCache.mockClear();
    mockPDFiumDocumentContext.loadDocument.mockClear();
    mockPDFiumDocumentContext.loadDocumentFromUrl.mockClear();
    mockPDFiumDocumentContext.password.submit.mockClear();
    mockPDFiumDocumentContext.password.cancel.mockClear();
  });

  it('provides default tool as idle', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    expect(result.current.activeTool).toBe('idle');
  });

  it('setActiveTool updates the active tool', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    act(() => {
      result.current.setActiveTool('ink');
    });

    expect(result.current.activeTool).toBe('ink');
  });

  it('setActiveTool clears the current selection', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelection({ pageIndex: 0, annotationIndex: 1 });
    });
    expect(result.current.selection).not.toBeNull();

    act(() => {
      result.current.setActiveTool('ink');
    });

    expect(result.current.selection).toBeNull();
  });

  it('triggerMarkupAction queues one-shot markup requests', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    expect(result.current.pendingMarkupAction).toBeNull();

    act(() => {
      result.current.triggerMarkupAction('highlight');
    });

    expect(result.current.pendingMarkupAction?.tool).toBe('highlight');
    expect(result.current.pendingMarkupAction?.requestId).toBeGreaterThan(0);
  });

  it('clearPendingMarkupAction clears matching request', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    act(() => {
      result.current.triggerMarkupAction('underline');
    });
    const requestId = result.current.pendingMarkupAction?.requestId;
    expect(requestId).toBeDefined();

    act(() => {
      result.current.clearPendingMarkupAction(requestId);
    });

    expect(result.current.pendingMarkupAction).toBeNull();
  });

  it('setActiveTool clears any pending markup action', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    act(() => {
      result.current.triggerMarkupAction('strikeout');
    });
    expect(result.current.pendingMarkupAction?.tool).toBe('strikeout');

    act(() => {
      result.current.setActiveTool('ink');
    });

    expect(result.current.pendingMarkupAction).toBeNull();
  });

  it('setSelection updates selection state', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelection({ pageIndex: 2, annotationIndex: 5 });
    });

    expect(result.current.selection).toEqual({ pageIndex: 2, annotationIndex: 5 });
  });

  it('setSelection accepts null to clear selection', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelection({ pageIndex: 0, annotationIndex: 0 });
    });
    act(() => {
      result.current.setSelection(null);
    });

    expect(result.current.selection).toBeNull();
  });

  it('updateToolConfig merges config without replacing other tools', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateToolConfig('ink', { strokeWidth: 5 });
    });

    expect(result.current.toolConfigs.ink.strokeWidth).toBe(5);
    // Default colour is still present
    expect(result.current.toolConfigs.ink.colour).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    // Other tool configs are unaffected
    expect(result.current.toolConfigs.highlight).toBeDefined();
  });

  it('push executes command and marks isDirty as true', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    expect(result.current.commandStack.isDirty).toBe(false);

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });

    expect(cmd.execute).toHaveBeenCalledOnce();
    expect(result.current.commandStack.isDirty).toBe(true);
    expect(result.current.commandStack.canUndo).toBe(true);
    expect(result.current.commandStack.canRedo).toBe(false);
  });

  it('context-level isDirty/canUndo/canRedo are reactive after push (not stale)', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });

    // These read from the useMemo context value, not commandStack directly.
    // stackVersion in the useMemo deps ensures they are fresh.
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo delegates to command stack and bumps document revision', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });
    act(() => {
      result.current.setSelection({ pageIndex: 0, annotationIndex: 0 });
      result.current.triggerMarkupAction('highlight');
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(cmd.undo).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalledOnce();
    expect(result.current.commandStack.canUndo).toBe(false);
    expect(result.current.commandStack.canRedo).toBe(true);
    expect(result.current.selection).toBeNull();
    expect(result.current.pendingMarkupAction).toBeNull();
  });

  it('redo delegates to command stack and bumps document revision', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });
    await act(async () => {
      await result.current.undo();
    });
    act(() => {
      result.current.setSelection({ pageIndex: 0, annotationIndex: 0 });
      result.current.triggerMarkupAction('underline');
    });
    mockBumpDocumentRevision.mockClear();

    await act(async () => {
      await result.current.redo();
    });

    expect(cmd.execute).toHaveBeenCalledTimes(2);
    expect(mockBumpDocumentRevision).toHaveBeenCalledOnce();
    expect(result.current.commandStack.canUndo).toBe(true);
    expect(result.current.commandStack.canRedo).toBe(false);
    expect(result.current.selection).toBeNull();
    expect(result.current.pendingMarkupAction).toBeNull();
  });

  it('undo waits for in-flight annotation mutations to settle before applying history', async () => {
    const { result } = renderHook(
      () => ({
        editor: useEditor(),
        mutationStore: useAnnotationMutationStore(),
      }),
      { wrapper: createWrapper() },
    );
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.editor.commandStack.push(cmd);
    });

    let completeMutation: (() => void) | null = null;
    act(() => {
      completeMutation = result.current.mutationStore.begin(0, 0, {
        colour: {
          stroke: { r: 0, g: 255, b: 0, a: 255 },
        },
      });
    });

    let undoPromise: Promise<void> | null = null;
    act(() => {
      undoPromise = result.current.editor.undo();
    });

    await Promise.resolve();
    expect(cmd.undo).not.toHaveBeenCalled();

    act(() => {
      completeMutation?.();
    });

    await act(async () => {
      await undoPromise;
    });

    expect(cmd.undo).toHaveBeenCalledOnce();
  });

  it('redo waits for in-flight annotation mutations to settle before applying history', async () => {
    const { result } = renderHook(
      () => ({
        editor: useEditor(),
        mutationStore: useAnnotationMutationStore(),
      }),
      { wrapper: createWrapper() },
    );
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.editor.commandStack.push(cmd);
    });
    await act(async () => {
      await result.current.editor.undo();
    });

    let completeMutation: (() => void) | null = null;
    act(() => {
      completeMutation = result.current.mutationStore.begin(0, 0, {
        colour: {
          stroke: { r: 0, g: 255, b: 0, a: 255 },
        },
      });
    });

    let redoPromise: Promise<void> | null = null;
    act(() => {
      redoPromise = result.current.editor.redo();
    });

    await Promise.resolve();
    expect(cmd.execute).toHaveBeenCalledTimes(1);

    act(() => {
      completeMutation?.();
    });

    await act(async () => {
      await redoPromise;
    });

    expect(cmd.execute).toHaveBeenCalledTimes(2);
  });

  it('isDirty tracks command stack — true after push, false after markClean', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    expect(result.current.commandStack.isDirty).toBe(false);

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });
    expect(result.current.commandStack.isDirty).toBe(true);

    act(() => {
      result.current.markClean();
    });
    expect(result.current.commandStack.isDirty).toBe(false);
  });

  it('throws when useEditor is called outside an EditorProvider', () => {
    // renderHook with no wrapper — useEditor should throw
    expect(() => {
      renderHook(() => useEditor());
    }).toThrow('useEditor must be used within an EditorProvider');
  });

  it('accepts initialTool prop', () => {
    const { result } = renderHook(() => useEditor(), {
      wrapper: createWrapper({ initialTool: 'ink' }),
    });

    expect(result.current.activeTool).toBe('ink');
  });

  it('accepts toolConfigs override for a specific tool', () => {
    const customColour = { r: 255, g: 0, b: 0, a: 255 };
    const { result } = renderHook(() => useEditor(), {
      wrapper: createWrapper({
        toolConfigs: { ink: { colour: customColour, strokeWidth: 3 } },
      }),
    });

    expect(result.current.toolConfigs.ink.colour).toEqual(customColour);
    expect(result.current.toolConfigs.ink.strokeWidth).toBe(3);
    // Other tools retain their defaults
    expect(result.current.toolConfigs.highlight).toBeDefined();
  });

  it('exposes commandStack on the context value', () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });

    expect(result.current.commandStack).toBeDefined();
    expect(typeof result.current.commandStack.push).toBe('function');
  });

  it('markClean makes isDirty reactive to false', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.markClean();
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('clear makes canUndo reactive to false', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper: createWrapper() });
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.commandStack.push(cmd);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.commandStack.clear();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('resets editor session state when the document identity changes', async () => {
    mockPDFiumDocumentContext.document = { id: 'doc-1' };
    const { result, rerender } = renderHook(
      () => ({
        editor: useEditor(),
        mutationStore: useAnnotationMutationStore(),
      }),
      { wrapper: createWrapper() },
    );
    const cmd = makeMockCommand();

    await act(async () => {
      await result.current.editor.commandStack.push(cmd);
    });
    act(() => {
      result.current.editor.setActiveTool('rectangle');
      result.current.editor.setSelection({ pageIndex: 0, annotationIndex: 2 });
      result.current.editor.triggerMarkupAction('highlight');
      result.current.mutationStore.preview(0, 2, {
        colour: {
          stroke: { r: 255, g: 0, b: 0, a: 255 },
        },
      });
    });
    expect(result.current.editor.activeTool).toBe('rectangle');
    expect(result.current.editor.selection).toEqual({ pageIndex: 0, annotationIndex: 2 });
    expect(result.current.editor.pendingMarkupAction?.tool).toBe('highlight');
    expect(result.current.editor.canUndo).toBe(true);
    expect(result.current.editor.isDirty).toBe(true);
    expect(result.current.mutationStore.getPreviewPatch(0, 2)).toBeDefined();

    mockPDFiumDocumentContext.document = { id: 'doc-2' };
    rerender();

    expect(result.current.editor.activeTool).toBe('idle');
    expect(result.current.editor.selection).toBeNull();
    expect(result.current.editor.pendingMarkupAction).toBeNull();
    expect(result.current.editor.canUndo).toBe(false);
    expect(result.current.editor.canRedo).toBe(false);
    expect(result.current.editor.isDirty).toBe(false);
    expect(result.current.mutationStore.getPreviewPatch(0, 2)).toBeUndefined();
  });
});
