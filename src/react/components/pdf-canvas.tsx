import { type ComponentProps, type Ref, useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { usePDFiumStores } from '../internal/stores-context.js';

interface PDFCanvasProps extends Omit<ComponentProps<'canvas'>, 'width' | 'height'> {
  width: number;
  height: number;
  renderKey?: string | null;
  data?: Uint8Array;
  ref?: Ref<HTMLCanvasElement>;
}

function PDFCanvas({ width, height, renderKey, data, ref, ...props }: PDFCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const { renderStore } = usePDFiumStores();
  const paintedRef = useRef(false);

  const mergedRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const storeResult = useSyncExternalStore(
    renderStore.subscribe,
    () => renderStore.getSnapshot(renderKey ?? null),
    () => renderStore.getServerSnapshot(),
  );

  const resolvedData = storeResult?.data ?? data;

  // Canvas buffer dimensions are managed imperatively — setting width/height as
  // React attributes would clear the canvas on every re-render. Instead, we only
  // resize when new pixel data is ready to paint, keeping old content visible
  // during document swaps (no flash).
  useLayoutEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;

    if (!resolvedData) {
      // No pixel data yet — size the canvas on first mount only
      if (!paintedRef.current) {
        canvas.width = width;
        canvas.height = height;
      }
      return;
    }

    // Atomic: resize + paint in a single layout frame
    canvas.width = width;
    canvas.height = height;
    paintedRef.current = true;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clampedData: Uint8ClampedArray<ArrayBuffer>;
    if (resolvedData.buffer instanceof ArrayBuffer) {
      clampedData = new Uint8ClampedArray(resolvedData.buffer, resolvedData.byteOffset, resolvedData.length);
    } else {
      // SharedArrayBuffer — copy into a fresh ArrayBuffer
      clampedData = new Uint8ClampedArray(resolvedData.length);
      clampedData.set(resolvedData);
    }
    const imageData = new ImageData(clampedData, width, height);
    ctx.putImageData(imageData, 0, 0);
  }, [width, height, resolvedData]);

  return <canvas role="img" aria-label="Rendered PDF page" {...props} ref={mergedRef} />;
}

export { PDFCanvas };
export type { PDFCanvasProps };
