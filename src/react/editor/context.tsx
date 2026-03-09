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

import type { ReactNode } from 'react';
import { usePDFiumDocument } from '../context.js';
import { EditorProviderTree } from './components/editor-provider-tree.js';
import type { EditorProviderProps } from './editor-context.types.js';
import { useEditorProviderRuntime } from './hooks/use-editor-provider-runtime.js';

export type { EditorContextValue, EditorProviderProps } from './editor-context.types.js';
export { useEditor, useEditorOptional } from './hooks/use-editor-context-access.js';

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
  const { contextValue, mutationStore, selectionBridgeValue } = useEditorProviderRuntime({
    bumpDocumentRevision,
    documentId: document?.id ?? null,
    ...(initialTool !== undefined ? { initialTool } : {}),
    ...(maxUndoDepth !== undefined ? { maxUndoDepth } : {}),
    ...(toolConfigOverrides !== undefined ? { toolConfigOverrides } : {}),
  });

  return (
    <EditorProviderTree
      contextValue={contextValue}
      mutationStore={mutationStore}
      selectionBridgeValue={selectionBridgeValue}
    >
      {children}
    </EditorProviderTree>
  );
}
