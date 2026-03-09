import { expect, test } from '@playwright/test';
import {
  clearSelectionByClickingBlankPoint,
  createTextMarkupAndOpenProperties,
  expectNoPageErrors,
  getHitTargetIndices,
  MARKUP_CASES,
  selectNewestHitTarget,
  switchToEditor,
} from './editor-test-support.js';

export function registerEditorMarkupColourPersistenceTests(): void {
  test('highlight colour edits persist after deselect/reselect', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await createTextMarkupAndOpenProperties(page, MARKUP_CASES[0]!);

      const fillInput = page.locator('[data-testid="interior-colour-input"]');
      await expect(fillInput).toBeVisible();
      await fillInput.fill('#00ff00');
      await expect.poll(async () => await fillInput.inputValue()).toBe('#00ff00');

      const indices = await getHitTargetIndices(page);
      expect(indices.length).toBeGreaterThan(0);
      const newestIndex = Math.max(...indices);

      await clearSelectionByClickingBlankPoint(page, 0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);

      await selectNewestHitTarget(page);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toBeVisible();
      await expect
        .poll(async () => await page.locator('[data-testid="interior-colour-input"]').inputValue())
        .toBe('#00ff00');
      expect(newestIndex).toBeGreaterThanOrEqual(0);
    });
  });
}
