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

export function registerEditorPropertyDeleteGuardTests(): void {
  test('typing Backspace/Delete inside property fields does not delete the selected annotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const countAfterCreate = await countHitTargets(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await expect(propertyPanel).toBeVisible();

      const contentsInput = page.locator('[data-testid="contents-input"]');
      await contentsInput.fill('abc');
      await contentsInput.focus();
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Delete');

      await expect(contentsInput).toHaveValue('ab');
      await expect(propertyPanel).toBeVisible();
      await expect.poll(() => countHitTargets(page)).toBe(countAfterCreate);
    });
  });
}
