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

export function registerEditorLinePreviewLiveInfoTests(): void {
  test('line info updates live while an endpoint drag is in progress', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const lineInfo = page.locator('[data-testid="line-info"]');
      await expect(lineInfo).toBeVisible();
      const beforeText = await lineInfo.innerText();

      const endHandle = page.locator('[data-testid="handle-end"]');
      await expect(endHandle).toBeVisible();
      const handleBox = await endHandle.boundingBox();
      expect(handleBox).not.toBeNull();

      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 35, handleBox!.y + handleBox!.height / 2 + 20, {
        steps: 5,
      });

      await expect(page.locator('[data-testid="selection-shape-preview"]')).toHaveCount(1);
      await expect.poll(async () => await lineInfo.innerText(), { timeout: 10_000 }).not.toBe(beforeText);

      await page.mouse.up();
    });
  });
}
