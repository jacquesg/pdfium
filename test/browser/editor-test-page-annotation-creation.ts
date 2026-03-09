import { expect, type Page } from '@playwright/test';
import { countHitTargetsOnPage, countRedactionsOnPage } from './editor-test-annotation-counts.js';
import { editorBtn, switchToTool, switchToViewerSelectText } from './editor-test-controls.js';
import { drawRectangleOnPage } from './editor-test-geometry.js';

export async function ensureRectangleCreatedOnPage(
  page: Page,
  pageIndex: number,
  baselineCount: number,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    await switchToTool(page, 'Rectangle');
    await drawRectangleOnPage(page, pageIndex);
    await switchToViewerSelectText(page);
    try {
      await expect
        .poll(() => countHitTargetsOnPage(page, pageIndex), { timeout: 7_500 })
        .toBeGreaterThan(baselineCount);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to create rectangle on page ${String(pageIndex + 1)} after retries`);
}

export async function ensureRedactionCreatedOnPage(
  page: Page,
  pageIndex: number,
  baselineCount: number,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    await switchToTool(page, 'Redact');
    await drawRectangleOnPage(page, pageIndex);
    try {
      await expect
        .poll(() => countRedactionsOnPage(page, pageIndex), { timeout: 7_500 })
        .toBeGreaterThan(baselineCount);
      await expect(editorBtn(page, 'Redact')).toHaveAttribute('aria-pressed', 'false');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to create redaction on page ${String(pageIndex + 1)} after retries`);
}
