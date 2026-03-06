/**
 * Editor context and provider.
 *
 * The `EditorProvider` is an opt-in layer that sits alongside (not inside)
 * `PDFiumProvider`. It consumes `usePDFiumDocument()` for cache invalidation
 * and provides editor-specific state: active tool, selection, undo/redo,
 * dirty tracking, and tool configurations.
 *
 * @module react/editor/context
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePDFiumDocument } from '../context.js';
import { AnnotationSelectionBridgeContext } from '../internal/annotation-selection-bridge-context.js';
import { CommandStack } from './command.js';
import { AnnotationMutationStore, AnnotationMutationStoreProvider } from './internal/annotation-mutation-store.js';
import { createInitialState, editorReducer } from './internal/editor-reducer.js';
import { flushPendingEditorCommits } from './internal/flush-pending-editor-commits.js';
import {
  type AnnotationSelection,
  DEFAULT_TOOL_CONFIGS,
  type EditorMode,
  type TextMarkupActionTool,
  type ToolConfigKey,
  type ToolConfigMap,
} from './types.js';

// ────────────────────────────────────────────────────────────
// Context value
// ────────────────────────────────────────────────────────────

/**
 * Values exposed by the editor context.
 */
export interface EditorContextValue {
  /** The current editor mode. */
  readonly activeTool: EditorMode;
  /** Change the active editor tool. Clears the current selection. */
  setActiveTool(tool: EditorMode): void;
  /** Most recently requested one-shot text markup action. */
  readonly pendingMarkupAction: { tool: TextMarkupActionTool; requestId: number } | null;
  /** Queue a one-shot text markup action from the current browser text selection. */
  triggerMarkupAction(tool: TextMarkupActionTool): void;
  /** Clear the pending markup action after processing. */
  clearPendingMarkupAction(requestId?: number): void;
  /** The currently selected annotation, or `null` if none. */
  readonly selection: AnnotationSelection | null;
  /** Set or clear the annotation selection. */
  setSelection(selection: AnnotationSelection | null): void;
  /** Per-tool configuration values. */
  readonly toolConfigs: ToolConfigMap;
  /** Update the configuration for a specific tool. */
  updateToolConfig<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>): void;
  /** Whether the document has unsaved changes. */
  readonly isDirty: boolean;
  /** Whether there are commands that can be undone. */
  readonly canUndo: boolean;
  /** Whether there are commands that can be redone. */
  readonly canRedo: boolean;
  /** Undo the most recent command and bump document revision. */
  undo(): Promise<void>;
  /** Redo the most recently undone command and bump document revision. */
  redo(): Promise<void>;
  /** Mark the current state as saved. */
  markClean(): void;
  /**
   * The underlying command stack.
   * @internal Exposed for command creators — not part of the public API.
   */
  readonly commandStack: CommandStack;
}

// ────────────────────────────────────────────────────────────
// Provider props
// ────────────────────────────────────────────────────────────

/**
 * Props for the `EditorProvider` component.
 */
export interface EditorProviderProps {
  /** The initial editor mode (default: `'idle'`). */
  readonly initialTool?: EditorMode;
  /** Override default tool configurations. */
  readonly toolConfigs?: Partial<ToolConfigMap>;
  /** Maximum undo stack depth (default: 100). */
  readonly maxUndoDepth?: number;
  children: ReactNode;
}

// ────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextValue | null>(null);

// ────────────────────────────────────────────────────────────
// CommandStack subscription for useSyncExternalStore
// ────────────────────────────────────────────────────────────

/**
 * Wraps CommandStack to provide a useSyncExternalStore-compatible API.
 *
 * Because CommandStack is a plain class (not React state), we need
 * to manually notify subscribers when its state changes.
 */
class ObservableCommandStack extends CommandStack {
  readonly #listeners = new Set<() => void>();
  #version = 0;

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getSnapshot(): number {
    return this.#version;
  }

  #notify(): void {
    this.#version++;
    for (const listener of this.#listeners) {
      listener();
    }
  }

  override async push(command: Parameters<CommandStack['push']>[0]): Promise<void> {
    await super.push(command);
    this.#notify();
  }

  override async undo(): Promise<void> {
    await super.undo();
    this.#notify();
  }

  override async redo(): Promise<void> {
    await super.redo();
    this.#notify();
  }

  override markClean(): void {
    super.markClean();
    this.#notify();
  }

  override clear(): void {
    super.clear();
    this.#notify();
  }
}

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────

/**
 * Provides editor state to descendant components.
 *
 * Must be rendered inside a `PDFiumProvider` tree (it consumes
 * `usePDFiumDocument()` for cache invalidation after mutations).
 *
 * @example
 * ```tsx
 * <PDFiumProvider {...viewerProps}>
 *   <EditorProvider>
 *     <MyEditorUI />
 *   </EditorProvider>
 * </PDFiumProvider>
 * ```
 */
export function EditorProvider({
  children,
  initialTool,
  toolConfigs: toolConfigOverrides,
  maxUndoDepth,
}: EditorProviderProps): ReactNode {
  const { document, bumpDocumentRevision } = usePDFiumDocument();

  // Command stack (stable across renders)
  const stackRef = useRef<ObservableCommandStack | null>(null);
  if (stackRef.current === null) {
    stackRef.current = new ObservableCommandStack(maxUndoDepth);
  }
  const stack = stackRef.current;

  const mutationStoreRef = useRef<AnnotationMutationStore | null>(null);
  if (mutationStoreRef.current === null) {
    mutationStoreRef.current = new AnnotationMutationStore();
  }
  const mutationStore = mutationStoreRef.current;
  const sessionDocumentIdRef = useRef<string | null>(document?.id ?? null);

  useEffect(
    () => () => {
      mutationStore.destroy();
    },
    [mutationStore],
  );

  useEffect(() => {
    const nextDocumentId = document?.id ?? null;
    if (sessionDocumentIdRef.current === nextDocumentId) {
      return;
    }
    sessionDocumentIdRef.current = nextDocumentId;
    setPendingMarkupAction(null);
    dispatch({ type: 'setTool', tool: 'idle' });
    dispatch({ type: 'setSelection', selection: null });
    stack.clear();
    mutationStore.reset();
  }, [document, mutationStore, stack]);

  // Subscribe to command stack changes — version is used in useMemo deps
  // to ensure isDirty/canUndo/canRedo re-compute on stack mutations
  const subscribe = useCallback((listener: () => void) => stack.subscribe(listener), [stack]);
  const getSnapshot = useCallback(() => stack.getSnapshot(), [stack]);
  const stackVersion = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Editor state (tool, selection, configs) — computed once on mount via lazy initialiser
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    createInitialState({
      ...(initialTool !== undefined ? { activeTool: initialTool } : {}),
      ...(toolConfigOverrides !== undefined
        ? { toolConfigs: { ...DEFAULT_TOOL_CONFIGS, ...toolConfigOverrides } }
        : {}),
    }),
  );
  const [pendingMarkupAction, setPendingMarkupAction] = useState<{
    tool: TextMarkupActionTool;
    requestId: number;
  } | null>(null);
  const markupActionCounterRef = useRef(0);

  // Stable callbacks
  const setActiveTool = useCallback((tool: EditorMode) => {
    setPendingMarkupAction(null);
    dispatch({ type: 'setTool', tool });
  }, []);

  const triggerMarkupAction = useCallback((tool: TextMarkupActionTool) => {
    markupActionCounterRef.current += 1;
    setPendingMarkupAction({ tool, requestId: markupActionCounterRef.current });
  }, []);

  const clearPendingMarkupAction = useCallback((requestId?: number) => {
    setPendingMarkupAction((previous) => {
      if (previous === null) return null;
      if (requestId !== undefined && previous.requestId !== requestId) {
        return previous;
      }
      return null;
    });
  }, []);

  const setSelection = useCallback((selection: AnnotationSelection | null) => {
    dispatch({ type: 'setSelection', selection });
  }, []);

  const updateToolConfig = useCallback(<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => {
    dispatch({ type: 'updateToolConfig', tool, config });
  }, []);

  const flushPendingMutationsBeforeHistoryNavigation = useCallback(async () => {
    await flushPendingEditorCommits(mutationStore);
  }, [mutationStore]);

  const undo = useCallback(async () => {
    if (!stack.canUndo) {
      return;
    }
    await flushPendingMutationsBeforeHistoryNavigation();
    if (!stack.canUndo) {
      return;
    }
    setPendingMarkupAction(null);
    await stack.undo();
    setSelection(null);
    bumpDocumentRevision();
  }, [stack, bumpDocumentRevision, setSelection, flushPendingMutationsBeforeHistoryNavigation]);

  const redo = useCallback(async () => {
    if (!stack.canRedo) {
      return;
    }
    await flushPendingMutationsBeforeHistoryNavigation();
    if (!stack.canRedo) {
      return;
    }
    setPendingMarkupAction(null);
    await stack.redo();
    setSelection(null);
    bumpDocumentRevision();
  }, [stack, bumpDocumentRevision, setSelection, flushPendingMutationsBeforeHistoryNavigation]);

  const markClean = useCallback(() => {
    stack.markClean();
  }, [stack]);

  // Build context value — stackVersion forces re-computation when the
  // command stack mutates so isDirty/canUndo/canRedo stay fresh.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stackVersion triggers re-computation for stack-derived values
  const value = useMemo<EditorContextValue>(
    () => ({
      activeTool: state.activeTool,
      setActiveTool,
      pendingMarkupAction,
      triggerMarkupAction,
      clearPendingMarkupAction,
      selection: state.selection,
      setSelection,
      toolConfigs: state.toolConfigs,
      updateToolConfig,
      isDirty: stack.isDirty,
      canUndo: stack.canUndo,
      canRedo: stack.canRedo,
      undo,
      redo,
      markClean,
      commandStack: stack,
    }),
    [
      state.activeTool,
      pendingMarkupAction,
      state.selection,
      state.toolConfigs,
      setActiveTool,
      triggerMarkupAction,
      clearPendingMarkupAction,
      setSelection,
      updateToolConfig,
      stack,
      stackVersion,
      undo,
      redo,
      markClean,
    ],
  );

  const selectionBridgeValue = useMemo(
    () => ({
      selection: state.selection,
      setSelection,
    }),
    [state.selection, setSelection],
  );

  return (
    <AnnotationSelectionBridgeContext.Provider value={selectionBridgeValue}>
      <AnnotationMutationStoreProvider store={mutationStore}>
        <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
      </AnnotationMutationStoreProvider>
    </AnnotationSelectionBridgeContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────
// Consumer hook
// ────────────────────────────────────────────────────────────

/**
 * Access the editor context.
 *
 * Must be called within an `EditorProvider`.
 *
 * @throws {Error} If called outside an `EditorProvider`
 */
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (ctx === null) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}

export function useEditorOptional(): EditorContextValue | null {
  return useContext(EditorContext);
}
