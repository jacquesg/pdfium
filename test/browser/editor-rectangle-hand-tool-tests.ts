import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  ensureRectangleCreatedOnPage,
  expectNoPageErrors,
  HIT_TARGET_SELECTOR,
  isViewerHandToolActive,
  selectNewestHitTarget,
  switchToEditor,
  switchToViewerHandTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleHandToolTests(): void {
  test('hand tool disables annotation selection hit targets', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await ensureRectangleCreatedOnPage(page, 0, countBefore);

      const hitTargets = page.locator(HIT_TARGET_SELECTOR);
      const countAfter = await hitTargets.count();
      expect(countAfter).toBeGreaterThan(countBefore);
      await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await expect(propertyPanel).toBeVisible();

      await switchToViewerHandTool(page);
      await expect.poll(() => countHitTargets(page)).toBe(0);
      await expect(propertyPanel).not.toBeVisible();
      await expect.poll(async () => isViewerHandToolActive(page)).toBe(true);
    });
  });
}
