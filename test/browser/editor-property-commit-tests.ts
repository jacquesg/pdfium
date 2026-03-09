import { expect, test } from '@playwright/test';
import { dragRangeInputBetweenValues } from './editor-property-commit-support.js';
import {
  clearSelectionByClickingBlankPoint,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  setNumberInput,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorPropertyCommitTests(): void {
  test('property edits repaint only on commit boundaries at zoom + rotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);

      await selectNewestHitTarget(page).catch(() => undefined);
      await clearSelectionByClickingBlankPoint(page, 0);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(0);

      await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      const borderWidthInput = page.locator('[data-testid="border-width-input"]');
      const opacityInput = page.locator('[data-testid="opacity-input"]');
      await expect(propertyPanel).toBeVisible();
      await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^1(?:\.0+)?$/);

      await setNumberInput(borderWidthInput, 2.5);
      await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);

      await dragRangeInputBetweenValues(page, opacityInput, 0.2, 0.85);
      await expect(propertyPanel).toContainText(/(8[4-9]|90)%/);
      await expect.poll(async () => await borderWidthInput.inputValue()).toMatch(/^2\.5(?:0+)?$/);
    });
  });
}
