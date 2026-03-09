import { useMemo } from 'react';
import type { EditorMode, ToolConfigMap } from '../types.js';
import { useEditorProviderHistory } from './use-editor-provider-history.js';
import { useEditorProviderRuntimeOptions } from './use-editor-provider-runtime-options.js';
import { useEditorProviderRuntimeValues } from './use-editor-provider-runtime-values.js';
import { useEditorProviderSession } from './use-editor-provider-session.js';
import { useEditorProviderState } from './use-editor-provider-state.js';

interface UseEditorProviderRuntimeOptions {
  readonly bumpDocumentRevision: () => void;
  readonly documentId: string | null;
  readonly initialTool?: EditorMode;
  readonly maxUndoDepth?: number;
  readonly toolConfigOverrides?: Partial<ToolConfigMap>;
}

export function useEditorProviderRuntime({
  bumpDocumentRevision,
  documentId,
  initialTool,
  maxUndoDepth,
  toolConfigOverrides,
}: UseEditorProviderRuntimeOptions) {
  const runtimeOptions = {
    documentId,
    resetEditorUIState: useMemo(() => () => {}, []),
    ...(initialTool !== undefined ? { initialTool } : {}),
    ...(maxUndoDepth !== undefined ? { maxUndoDepth } : {}),
    ...(toolConfigOverrides !== undefined ? { toolConfigOverrides } : {}),
  };
  const { providerStateOptions } = useEditorProviderRuntimeOptions({
    ...runtimeOptions,
  });
  const providerState = useEditorProviderState(providerStateOptions);
  const resolvedProviderSessionOptions = useEditorProviderRuntimeOptions({
    documentId,
    resetEditorUIState: providerState.resetEditorUIState,
    ...(initialTool !== undefined ? { initialTool } : {}),
    ...(maxUndoDepth !== undefined ? { maxUndoDepth } : {}),
    ...(toolConfigOverrides !== undefined ? { toolConfigOverrides } : {}),
  }).providerSessionOptions;
  const session = useEditorProviderSession(resolvedProviderSessionOptions);
  const { markClean, redo, undo } = useEditorProviderHistory({
    bumpDocumentRevision,
    mutationStore: session.mutationStore,
    onClearPendingMarkupAction: providerState.resetPendingMarkupAction,
    onClearSelection: () => {
      providerState.setSelection(null);
    },
    stack: session.stack,
  });
  const history = { markClean, redo, undo };
  const runtimeValues = useEditorProviderRuntimeValues({
    history,
    providerState,
    session,
  });

  return {
    ...runtimeValues,
    mutationStore: session.mutationStore,
  };
}
