import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { AnnotationSelection } from '../types.js';
import { isEditableElement } from './editor-interaction-bridge-support.js';
import { selectionRangeBelongsToPageRoot } from './editor-selection-lifecycle-support.js';

interface UseEditorSelectionClearOnNativeSelectionOptions {
  readonly clearSelection: () => void;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly effectiveSelectionEnabled: boolean;
  readonly isNeutralMode: boolean;
  readonly pageIndex: number;
  readonly selection: AnnotationSelection | null;
}

export function useEditorSelectionClearOnNativeSelection({
  clearSelection,
  containerRef,
  effectiveSelectionEnabled,
  isNeutralMode,
  pageIndex,
  selection,
}: UseEditorSelectionClearOnNativeSelectionOptions): void {
  useEffect(() => {
    if (!effectiveSelectionEnabled || !isNeutralMode || !selection) return;

    const handleSelectionChange = () => {
      if (isEditableElement(globalThis.document.activeElement)) {
        return;
      }
      const nativeSelection = globalThis.getSelection?.();
      if (!nativeSelection || nativeSelection.isCollapsed || nativeSelection.rangeCount === 0) return;

      const range = nativeSelection.getRangeAt(0);
      if (!selectionRangeBelongsToPageRoot(containerRef, pageIndex, range)) {
        return;
      }
      clearSelection();
    };

    globalThis.document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      globalThis.document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [clearSelection, containerRef, effectiveSelectionEnabled, isNeutralMode, pageIndex, selection]);
}
