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

export function registerEditorLinePreviewHandleTests(): void {
  test('line selections use endpoint handles and show live preview while dragging', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      await expect(page.locator('[data-testid="handle-start"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="handle-end"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="handle-se"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="handle-nw"]')).toHaveCount(0);

      const endHandle = page.locator('[data-testid="handle-end"]');
      await expect(endHandle).toBeVisible();
      const handleBox = await endHandle.boundingBox();
      expect(handleBox).not.toBeNull();

      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 40, handleBox!.y + handleBox!.height / 2 + 20, {
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
