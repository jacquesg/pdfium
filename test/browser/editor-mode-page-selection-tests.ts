import { expect, test } from '@playwright/test';
import {
  createRectanglesOnFirstTwoPages,
  selectNewestHitTargetAndAssertPageSelection,
} from './editor-mode-page-selection-support.js';
import {
  countHitTargetsOnPage,
  ensureAtLeastTwoPages,
  expectNoPageErrors,
  switchToEditor,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorModePageSelectionTests(): void {
  test('selection moves cleanly between annotations on different pages', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await ensureAtLeastTwoPages(page);

      await switchToViewerSelectText(page);
      await createRectanglesOnFirstTwoPages(page);
      await selectNewestHitTargetAndAssertPageSelection(page, 0);
      await selectNewestHitTargetAndAssertPageSelection(page, 1);
    });
  });

  test('Delete only removes the selection on the selected page', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await ensureAtLeastTwoPages(page);

      await switchToViewerSelectText(page);
      const { page0AfterCreate, page1AfterCreate } = await createRectanglesOnFirstTwoPages(page);
      await selectNewestHitTargetAndAssertPageSelection(page, 1);
      await page.keyboard.press('Delete');

      await expect.poll(() => countHitTargetsOnPage(page, 1), { timeout: 10_000 }).toBe(page1AfterCreate - 1);
      await expect.poll(() => countHitTargetsOnPage(page, 0), { timeout: 10_000 }).toBe(page0AfterCreate);
    });
  });
}
