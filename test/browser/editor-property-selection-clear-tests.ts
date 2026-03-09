import { expect, test } from '@playwright/test';
import {
  clickReachableLocator,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  HIT_TARGET_SELECTOR,
  selectTextOnFirstPage,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorPropertySelectionClearTests(): void {
  test('selecting text clears the currently selected annotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const hitTargets = page.locator(HIT_TARGET_SELECTOR);
      const countAfter = await hitTargets.count();
      await clickReachableLocator(page, hitTargets.nth(countAfter - 1));
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await expect(propertyPanel).toBeVisible();

      await selectTextOnFirstPage(page);
      await expect(propertyPanel).not.toBeVisible();
    });
  });
}
