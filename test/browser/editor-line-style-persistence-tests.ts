import { expect, test } from '@playwright/test';
import {
  clickBlankPointOnPage,
  clickReachableLocator,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  setNumberInput,
  setRangeInput,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorLineStylePersistenceTests(): void {
  test('line property edits persist for opacity and border width', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Line');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      const opacityInput = page.locator('[data-testid="opacity-input"]');
      const borderWidthInput = page.locator('[data-testid="border-width-input"]');
      await expect(propertyPanel).toBeVisible();

      await setNumberInput(borderWidthInput, 2);
      await setRangeInput(page, opacityInput, 0.5);
      await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
      await expect(propertyPanel).toContainText(/(49|50|51)%/);

      await clickBlankPointOnPage(page, 0);
      await expect(propertyPanel).not.toBeVisible();

      await clickReachableLocator(page, target);
      await expect(propertyPanel).toBeVisible();
      await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2(?:\.0+)?$/);
      await expect(propertyPanel).toContainText(/(49|50|51)%/);
    });
  });
}
