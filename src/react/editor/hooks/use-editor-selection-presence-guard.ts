import { useEffect, useRef } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { AnnotationSelection } from '../types.js';

interface UseEditorSelectionPresenceGuardOptions {
  readonly annotationsPending: boolean;
  readonly clearSelection: () => void;
  readonly effectiveSelectionEnabled: boolean;
  readonly pageIndex: number;
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly selection: AnnotationSelection | null;
}

export function useEditorSelectionPresenceGuard({
  annotationsPending,
  clearSelection,
  effectiveSelectionEnabled,
  pageIndex,
  resolvedAnnotations,
  selection,
}: UseEditorSelectionPresenceGuardOptions): void {
  const selectionPresenceRef = useRef<{ key: string | null; seenInAnnotations: boolean }>({
    key: null,
    seenInAnnotations: false,
  });

  useEffect(() => {
    if (effectiveSelectionEnabled || !selection || selection.pageIndex !== pageIndex) {
      return;
    }
    clearSelection();
  }, [clearSelection, effectiveSelectionEnabled, pageIndex, selection]);

  useEffect(() => {
    if (!selection || selection.pageIndex !== pageIndex) {
      selectionPresenceRef.current = { key: null, seenInAnnotations: false };
      return;
    }
    if (annotationsPending) return;

    const selectionKey = `${String(selection.pageIndex)}:${String(selection.annotationIndex)}`;
    if (selectionPresenceRef.current.key !== selectionKey) {
      selectionPresenceRef.current = { key: selectionKey, seenInAnnotations: false };
    }
    const stillExists = resolvedAnnotations.some((annotation) => annotation.index === selection.annotationIndex);
    if (stillExists) {
      selectionPresenceRef.current = { key: selectionKey, seenInAnnotations: true };
      return;
    }
    if (!selectionPresenceRef.current.seenInAnnotations) {
      return;
    }
    clearSelection();
  }, [annotationsPending, clearSelection, pageIndex, resolvedAnnotations, selection]);
}
