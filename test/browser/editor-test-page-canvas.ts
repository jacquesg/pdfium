import { expect, type Page } from '@playwright/test';
import { PAGE_SELECTOR } from './editor-test-page-view.js';

export async function getPageCanvasDataUrl(page: Page): Promise<string> {
  const canvas = page.locator(`${PAGE_SELECTOR} canvas`).first();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  return canvas.evaluate((node) => {
    if (!(node instanceof HTMLCanvasElement)) return '';
    return node.toDataURL();
  });
}

export async function waitForCanvasStable(page: Page): Promise<string> {
  let baseline = await getPageCanvasDataUrl(page);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(80);
    const next = await getPageCanvasDataUrl(page);
    if (next === baseline) {
      return next;
    }
    baseline = next;
  }
  return baseline;
}
