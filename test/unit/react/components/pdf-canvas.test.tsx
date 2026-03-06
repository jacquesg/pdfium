import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PDFCanvas } from '../../../../src/react/components/pdf-canvas.js';
import { queryStore } from '../../../../src/react/internal/query-store.js';
import { renderStore } from '../../../../src/react/internal/render-store.js';
import { PDFiumStoresContext } from '../../../../src/react/internal/stores-context.js';

// happy-dom does not provide ImageData; stub it for canvas paint tests
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as Record<string, unknown>).ImageData = class ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? dataOrWidth.length / (widthOrHeight * 4);
      }
    }
  };
}

/**
 * Spies on getContext for the next rendered canvas.
 * Returns a mock 2D context and a function to retrieve the canvas element.
 */
function spyOnCanvasContext() {
  const mockCtx = {
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    setLineDash: vi.fn(),
  };

  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as HTMLCanvasElement['getContext'];

  return {
    mockCtx,
    restore() {
      HTMLCanvasElement.prototype.getContext = original;
    },
  };
}

function StoresWrapper({ children }: { children: ReactNode }) {
  return <PDFiumStoresContext.Provider value={{ queryStore, renderStore }}>{children}</PDFiumStoresContext.Provider>;
}

describe('PDFCanvas', () => {
  it('renders a canvas with role="img" and default aria-label', () => {
    const { container } = render(<PDFCanvas width={100} height={100} />, { wrapper: StoresWrapper });

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-label')).toBe('Rendered PDF page');
  });

  it('allows consumer to override the default aria-label', () => {
    const { container } = render(<PDFCanvas width={100} height={100} aria-label="Page 3 of document" />, {
      wrapper: StoresWrapper,
    });

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('Page 3 of document');
  });

  it('paints from renderKey when renderStore has data', async () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const pixelData = new Uint8Array(100 * 100 * 4);
      renderStore.set('paint-rk-key', {
        data: pixelData,
        width: 100,
        height: 100,
        originalWidth: 612,
        originalHeight: 792,
      });

      // Allow the microtask-batched notification to fire
      await vi.waitFor(() => {
        expect(renderStore.getSnapshot('paint-rk-key')).toBeDefined();
      });

      render(<PDFCanvas width={100} height={100} renderKey="paint-rk-key" />, { wrapper: StoresWrapper });

      // The component's useLayoutEffect calls getContext('2d') and putImageData
      expect(mockCtx.putImageData).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('paints from data prop when provided directly', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const pixelData = new Uint8Array(50 * 50 * 4);

      render(<PDFCanvas width={50} height={50} data={pixelData} />, { wrapper: StoresWrapper });

      expect(mockCtx.putImageData).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('sets canvas width and height attributes from props', () => {
    const { container } = render(<PDFCanvas width={320} height={240} />, { wrapper: StoresWrapper });

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(240);
  });

  it('re-paints when width and height change', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const pixelData = new Uint8Array(200 * 200 * 4);

      const { rerender } = render(<PDFCanvas width={100} height={100} data={pixelData} />, {
        wrapper: StoresWrapper,
      });

      const callsBefore = mockCtx.putImageData.mock.calls.length;

      rerender(<PDFCanvas width={200} height={200} data={pixelData} />);

      expect(mockCtx.putImageData.mock.calls.length).toBeGreaterThan(callsBefore);
    } finally {
      restore();
    }
  });

  it('forwards ref to the canvas element', () => {
    const ref = createRef<HTMLCanvasElement>();

    render(<PDFCanvas width={100} height={100} ref={ref} />, { wrapper: StoresWrapper });

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it('invokes function refs with the canvas element', () => {
    const ref = vi.fn();

    render(<PDFCanvas width={100} height={100} ref={ref} />, { wrapper: StoresWrapper });

    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0]?.[0]).toBeInstanceOf(HTMLCanvasElement);
  });

  it('spreads additional props onto the canvas element', () => {
    const { container } = render(
      <PDFCanvas
        width={100}
        height={100}
        className="custom-canvas"
        style={{ border: '1px solid red' }}
        data-testid="pdf-canvas"
      />,
      { wrapper: StoresWrapper },
    );

    const canvas = container.querySelector('[data-testid="pdf-canvas"]') as HTMLCanvasElement;
    expect(canvas.className).toBe('custom-canvas');
    expect(canvas.style.border).toBe('1px solid red');
  });

  it('does not call putImageData when there is no data', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      render(<PDFCanvas width={100} height={100} />, { wrapper: StoresWrapper });

      // Without data or renderKey, putImageData should not be called
      expect(mockCtx.putImageData).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('skips painting when a 2D context is unavailable', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as HTMLCanvasElement['getContext'];

    try {
      const pixelData = new Uint8Array(50 * 50 * 4);
      const { container } = render(<PDFCanvas width={50} height={50} data={pixelData} />, { wrapper: StoresWrapper });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(50);
      expect(canvas.height).toBe(50);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('copies SharedArrayBuffer-backed pixel data before painting', () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      return;
    }

    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const data = new Uint8Array(new SharedArrayBuffer(25 * 25 * 4));
      render(<PDFCanvas width={25} height={25} data={data} />, { wrapper: StoresWrapper });

      expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});
