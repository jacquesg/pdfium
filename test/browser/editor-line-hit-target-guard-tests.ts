import { expect, test } from '@playwright/test';
import {
  clickBlankPointOnPage,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  getSelectionOverlayBox,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineHitTargetGuardTests(): void {
  test('clicking inside a line bounding-box corner but away from the line does not select it', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const overlayBox = await getSelectionOverlayBox(page);
      const offLinePoint = {
        x: overlayBox.x + overlayBox.width - 4,
        y: overlayBox.y + 4,
      };

      await clickBlankPointOnPage(page, 0);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

      await page.mouse.click(offLinePoint.x, offLinePoint.y);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
    });
  });
}
