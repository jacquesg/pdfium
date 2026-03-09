import { useMemo } from 'react';
import type { EditorMode, ToolConfigMap } from '../types.js';

interface UseEditorProviderRuntimeOptionsOptions {
  readonly documentId: string | null;
  readonly initialTool?: EditorMode;
  readonly maxUndoDepth?: number;
  readonly resetEditorUIState: () => void;
  readonly toolConfigOverrides?: Partial<ToolConfigMap>;
}

export function useEditorProviderRuntimeOptions({
  documentId,
  initialTool,
  maxUndoDepth,
  resetEditorUIState,
  toolConfigOverrides,
}: UseEditorProviderRuntimeOptionsOptions) {
  const providerStateOptions = useMemo(
    () => ({
      ...(initialTool !== undefined ? { initialTool } : {}),
      ...(toolConfigOverrides !== undefined ? { toolConfigOverrides } : {}),
    }),
    [initialTool, toolConfigOverrides],
  );

  const providerSessionOptions = useMemo(
    () => ({
      documentId,
      onDocumentSessionReset: resetEditorUIState,
      ...(maxUndoDepth !== undefined ? { maxUndoDepth } : {}),
    }),
    [documentId, maxUndoDepth, resetEditorUIState],
  );

  return {
    providerSessionOptions,
    providerStateOptions,
  };
}
