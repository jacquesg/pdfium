import { expect, test } from '@playwright/test';
import {
  clickBlankPointOnPage,
  clickReachableLocator,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  HIT_TARGET_SELECTOR,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorCircleHitTargetGuardTests(): void {
  test('clicking inside a circle bounding-box corner but away from the ellipse does not select it', async ({
    page,
  }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Circle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const hitTargets = page.locator(HIT_TARGET_SELECTOR);
      const target = hitTargets.nth((await hitTargets.count()) - 1);
      await clickReachableLocator(page, target);

      const targetBox = await target.boundingBox();
      expect(targetBox).not.toBeNull();
      const offEllipsePoint = {
        x: targetBox!.x + 4,
        y: targetBox!.y + 4,
      };

      await clickBlankPointOnPage(page, 0);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

      await page.mouse.click(offEllipsePoint.x, offEllipsePoint.y);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
    });
  });
}
