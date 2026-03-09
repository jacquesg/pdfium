import { expect, type Locator, type Page } from '@playwright/test';
import {
  clearSelectionByClickingBlankPoint,
  clickReachableLocator,
  getPageCanvasDataUrl,
  getSelectionOverlayBox,
  waitForCanvasStable,
} from './editor-test-support.js';

export async function resizeRotatedRectangleAndAssertRepaint(page: Page, target: Locator): Promise<void> {
  const before = await getSelectionOverlayBox(page);
  const beforeCanvas = await waitForCanvasStable(page);

  await page.locator('[data-testid="handle-se"]').hover();
  const handle = page.locator('[data-testid="handle-se"]');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2 + 50, {
    steps: 8,
  });
  await page.mouse.up();

  await expect
    .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
    .toBeGreaterThan(before.width + 20);
  await expect
    .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
    .toBeGreaterThan(before.height + 15);
  await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);

  await clearSelectionByClickingBlankPoint(page, 0);
  await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

  await clickReachableLocator(page, target);
  const persisted = await getSelectionOverlayBox(page);
  expect(persisted.width).toBeGreaterThan(before.width + 20);
  expect(persisted.height).toBeGreaterThan(before.height + 15);
}
