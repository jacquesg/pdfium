import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleLivePreviewTests(): void {
  test('rectangle resize shows a live shape preview during drag', async ({ page }) => {
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

      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 50, handleBox!.y + handleBox!.height / 2 + 30, {
        steps: 6,
      });

      await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(1);

      await page.mouse.up();
      await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="selection-committed-mask"]')).toHaveCount(0);
    });
  });
}
