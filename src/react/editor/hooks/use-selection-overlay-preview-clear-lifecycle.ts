import { useEffect, useRef } from 'react';

export function useSelectionOverlayPreviewClearLifecycle(onPreviewClear?: (() => void) | undefined): void {
  const previewClearRef = useRef(onPreviewClear);

  useEffect(() => {
    previewClearRef.current = onPreviewClear;
  }, [onPreviewClear]);

  useEffect(() => {
    return () => {
      previewClearRef.current?.();
    };
  }, []);
}
