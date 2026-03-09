import { expect, type Locator, type Page } from '@playwright/test';
import {
  clearSelectionByClickingBlankPoint,
  clickReachableLocator,
  getSelectionOverlayBox,
  waitForCanvasStable,
  zoomInViewer,
} from './editor-test-support.js';

export async function zoomViewerAndReselectRectangle(page: Page, target: Locator): Promise<number> {
  await zoomInViewer(page, 2);
  await waitForCanvasStable(page);
  await page.keyboard.press('Escape');
  await expect(target).toBeVisible();
  await clickReachableLocator(page, target);
  await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
  const before = await getSelectionOverlayBox(page);
  return before.width;
}

export async function resizeZoomedRectangleAndAssertPersistence(
  page: Page,
  target: Locator,
  beforeWidth: number,
): Promise<void> {
  await page.locator('[data-testid="handle-e"]').hover();
  await page.mouse.down();
  const handle = page.locator('[data-testid="handle-e"]');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 90, handleBox!.y + handleBox!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();

  await expect
    .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
    .toBeGreaterThan(beforeWidth + 35);

  await clearSelectionByClickingBlankPoint(page, 0);
  await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

  await clickReachableLocator(page, target);
  await expect
    .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
    .toBeGreaterThan(beforeWidth + 35);
}
