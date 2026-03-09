import type { BrowserPage } from './test-harness-types.js';

export async function renderHarnessPageToCanvas(
  page: BrowserPage,
): Promise<{ width: number; height: number; dataUrl: string }> {
  const result = await page.render({ scale: 1 });

  const canvas = globalThis.document.getElementById('pdf-canvas') as HTMLCanvasElement;
  canvas.width = result.width;
  canvas.height = result.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const imageData = new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
  ctx.putImageData(imageData, 0, 0);

  return {
    width: result.width,
    height: result.height,
    dataUrl: canvas.toDataURL('image/png'),
  };
}
