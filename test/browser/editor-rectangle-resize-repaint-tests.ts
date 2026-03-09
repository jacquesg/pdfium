import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  getPageCanvasDataUrl,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
  waitForCanvasStable,
} from './editor-test-support.js';

export function registerEditorRectangleResizeRepaintTests(): void {
  test('resizing rectangle repaints canvas immediately', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
      await selectNewestHitTarget(page);

      const handle = page.locator('[data-testid="handle-se"]');
      await expect(handle).toBeVisible();
      const handleBox = await handle.boundingBox();
      expect(handleBox).not.toBeNull();
      const beforeCanvas = await waitForCanvasStable(page);

      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2 + 50, {
        steps: 8,
      });
      await page.mouse.up();

      await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);
    });
  });
}
