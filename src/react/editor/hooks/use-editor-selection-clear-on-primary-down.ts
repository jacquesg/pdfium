import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { AnnotationSelection } from '../types.js';
import {
  eventBelongsToPageRoot,
  getEventClientPoint,
  getEventPathElements,
  getPrimaryEventTargetElement,
  isSecondaryMouseButton,
  shouldIgnoreSelectionPrimaryDown,
} from './editor-selection-lifecycle-support.js';

interface UseEditorSelectionClearOnPrimaryDownOptions {
  readonly clearSelection: () => void;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly effectiveSelectionEnabled: boolean;
  readonly isNeutralMode: boolean;
  readonly pageIndex: number;
  readonly selection: AnnotationSelection | null;
}

export function useEditorSelectionClearOnPrimaryDown({
  clearSelection,
  containerRef,
  effectiveSelectionEnabled,
  isNeutralMode,
  pageIndex,
  selection,
}: UseEditorSelectionClearOnPrimaryDownOptions): void {
  useEffect(() => {
    if (!effectiveSelectionEnabled || !isNeutralMode || !selection) return;
    const primaryDownEventName = typeof globalThis.PointerEvent === 'function' ? 'pointerdown' : 'mousedown';

    const handleDocumentPrimaryDown = (event: PointerEvent | MouseEvent) => {
      if (isSecondaryMouseButton(event)) {
        return;
      }
      const pathElements = getEventPathElements(event);
      const targetElement = getPrimaryEventTargetElement(event, pathElements);
      if (shouldIgnoreSelectionPrimaryDown(targetElement, pathElements)) {
        return;
      }
      if (!eventBelongsToPageRoot(containerRef, pageIndex, getEventClientPoint(event), targetElement)) {
        return;
      }
      clearSelection();
    };

    globalThis.document.addEventListener(primaryDownEventName, handleDocumentPrimaryDown, true);
    return () => {
      globalThis.document.removeEventListener(primaryDownEventName, handleDocumentPrimaryDown, true);
    };
  }, [clearSelection, containerRef, effectiveSelectionEnabled, isNeutralMode, pageIndex, selection]);
}
