import { useEffect, useRef } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { EditorContextValue } from '../context.js';
import type { AnnotationSelection } from '../types.js';
import { useEditorSelectionClearOnNativeSelection } from './use-editor-selection-clear-on-native-selection.js';
import { useEditorSelectionClearOnPrimaryDown } from './use-editor-selection-clear-on-primary-down.js';
import { useEditorSelectionPresenceGuard } from './use-editor-selection-presence-guard.js';

interface UseEditorSelectionLifecycleOptions {
  readonly annotationsPending: boolean;
  readonly clearPendingMarkupAction: EditorContextValue['clearPendingMarkupAction'];
  readonly clearSelection: () => void;
  readonly effectiveSelectionEnabled: boolean;
  readonly isNeutralMode: boolean;
  readonly pageIndex: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly selection: AnnotationSelection | null;
}

export function useEditorSelectionLifecycle({
  annotationsPending,
  clearPendingMarkupAction,
  clearSelection,
  effectiveSelectionEnabled,
  isNeutralMode,
  pageIndex,
  pendingMarkupAction,
  resolvedAnnotations,
  selection,
}: UseEditorSelectionLifecycleOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEditorSelectionClearOnPrimaryDown({
    clearSelection,
    containerRef,
    effectiveSelectionEnabled,
    isNeutralMode,
    pageIndex,
    selection,
  });
  useEditorSelectionClearOnNativeSelection({
    clearSelection,
    containerRef,
    effectiveSelectionEnabled,
    isNeutralMode,
    pageIndex,
    selection,
  });
  useEditorSelectionPresenceGuard({
    annotationsPending,
    clearSelection,
    effectiveSelectionEnabled,
    pageIndex,
    resolvedAnnotations,
    selection,
  });

  useEffect(() => {
    if (effectiveSelectionEnabled || pendingMarkupAction === null) return;
    clearPendingMarkupAction(pendingMarkupAction.requestId);
  }, [effectiveSelectionEnabled, pendingMarkupAction, clearPendingMarkupAction]);

  return { containerRef };
}
