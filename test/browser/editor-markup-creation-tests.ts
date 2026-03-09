import { expect, test } from '@playwright/test';
import {
  createTextMarkupAndOpenProperties,
  expectNoPageErrors,
  MARKUP_CASES,
  switchToEditor,
} from './editor-test-support.js';

export function registerEditorMarkupCreationTests(): void {
  for (const scenario of MARKUP_CASES) {
    test(`${scenario.toolLabel.toLowerCase()} tool creates ${scenario.expectedTypeLabel} annotation`, async ({
      page,
    }) => {
      await expectNoPageErrors(page, async () => {
        await switchToEditor(page);
        await createTextMarkupAndOpenProperties(page, scenario);
      });
    });
  }

  test('selected highlight uses text-markup selection chrome instead of bounds-box chrome', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await createTextMarkupAndOpenProperties(page, MARKUP_CASES[0]!);

      await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();
      await expect(page.locator('[data-testid="selection-markup-segment"]')).toHaveCount(1);
      await expect(page.locator('[data-testid^="handle-"]')).toHaveCount(0);
    });
  });
}
