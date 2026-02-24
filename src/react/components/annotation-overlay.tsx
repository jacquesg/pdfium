import { type ComponentProps, type Ref, useCallback, useLayoutEffect, useRef } from 'react';
import type { SerialisedAnnotation } from '../../context/protocol.js';

interface AnnotationOverlayProps extends Omit<ComponentProps<'canvas'>, 'width' | 'height'> {
  annotations: SerialisedAnnotation[];
  width: number;
  height: number;
  originalHeight: number;
  scale: number;
  selectedIndex?: number | null;
  maxOverlayCount?: number;
  ref?: Ref<HTMLCanvasElement>;
}

function AnnotationOverlay({
  annotations,
  width,
  height,
  originalHeight,
  scale,
  selectedIndex,
  maxOverlayCount = 100,
  ref,
  ...props
}: AnnotationOverlayProps) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);

  const mergedRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const toDraw = annotations.slice(0, maxOverlayCount);
    if (selectedIndex != null && selectedIndex >= maxOverlayCount && selectedIndex < annotations.length) {
      const selected = annotations[selectedIndex];
      if (selected) toDraw.push(selected);
    }

    for (let i = 0; i < toDraw.length; i++) {
      const ann = toDraw[i];
      if (!ann) continue;
      const bounds = ann.bounds;
      if (!bounds) continue;

      const x = bounds.left * scale;
      const y = (originalHeight - bounds.top) * scale;
      const w = (bounds.right - bounds.left) * scale;
      const h = (bounds.top - bounds.bottom) * scale;

      if (w < 0.5 || h < 0.5) continue;

      const originalIndex = i < maxOverlayCount ? i : (selectedIndex ?? i);
      const isSelected = originalIndex === selectedIndex;
      if (isSelected) {
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(220, 38, 38, 0.1)';
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
      }
      ctx.strokeRect(x, y, w, h);
    }
    ctx.setLineDash([]);
  }, [annotations, width, height, originalHeight, scale, selectedIndex, maxOverlayCount]);

  return (
    <canvas
      role="img"
      aria-label={`${annotations.length} annotation${annotations.length !== 1 ? 's' : ''}`}
      {...props}
      ref={mergedRef}
      width={width}
      height={height}
    />
  );
}

export { AnnotationOverlay };
export type { AnnotationOverlayProps };
