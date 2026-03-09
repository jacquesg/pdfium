import { useCallback, useRef, useState } from 'react';
import type { DragState } from '../components/shape-creation-overlay.types.js';

export function useShapeCreationDragState() {
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const publishDrag = useCallback((nextDrag: DragState | null) => {
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }, []);

  const clearDrag = useCallback(() => {
    publishDrag(null);
  }, [publishDrag]);

  return {
    clearDrag,
    containerRef,
    drag,
    dragRef,
    publishDrag,
  };
}
