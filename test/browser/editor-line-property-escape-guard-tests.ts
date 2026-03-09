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

export function registerEditorLinePropertyEscapeGuardTests(): void {
  test('Escape in property text field does not clear selected annotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      const authorInput = page.locator('[data-testid="author-input"]');
      await expect(propertyPanel).toBeVisible();
      const originalAuthor = await authorInput.inputValue();

      await authorInput.fill('QA Escape Guard');
      await authorInput.focus();
      await page.keyboard.press('Escape');

      await expect(propertyPanel).toBeVisible();
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(1);
      await expect(authorInput).toHaveValue(originalAuthor);
    });
  });
}
