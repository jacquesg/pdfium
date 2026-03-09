import { useCallback, useRef, useState } from 'react';
import type { ScreenLine } from '../components/selection-overlay.types.js';
import type { ScreenRect } from '../shape-constraints.js';

export function useSelectionOverlayPreviewSnapshots(initialScreenRect: ScreenRect, initialLine: ScreenLine | null) {
  const [previewRect, setPreviewRect] = useState<ScreenRect>(initialScreenRect);
  const [previewLine, setPreviewLine] = useState<ScreenLine | null>(initialLine);
  const previewRectRef = useRef<ScreenRect>(initialScreenRect);
  const previewLineRef = useRef<ScreenLine | null>(initialLine);

  const setPreviewRectValue = useCallback((screenRect: ScreenRect) => {
    previewRectRef.current = screenRect;
    setPreviewRect(screenRect);
  }, []);

  const setPreviewLineValue = useCallback((screenLine: ScreenLine | null) => {
    previewLineRef.current = screenLine;
    setPreviewLine(screenLine);
  }, []);

  const getPreviewRectSnapshot = useCallback((): ScreenRect => {
    return previewRectRef.current;
  }, []);

  const getPreviewLineSnapshot = useCallback((): ScreenLine | null => {
    return previewLineRef.current;
  }, []);

  return {
    getPreviewLineSnapshot,
    getPreviewRectSnapshot,
    previewLine,
    previewRect,
    setPreviewLineValue,
    setPreviewRectValue,
  };
}
