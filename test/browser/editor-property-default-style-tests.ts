import { expect, test } from '@playwright/test';
import {
  applyRectangleStyleDraft,
  assertRectangleStyleDraft,
  type RectangleStyleDraft,
} from './editor-rectangle-style-support.js';
import {
  clearSelectionByClickingBlankPoint,
  countHitTargetsOnPage,
  ensureNewestHitTargetOnPageOpensProperties,
  ensureRectangleCreatedOnPage,
  expectNoPageErrors,
  switchToEditor,
  switchToViewerSelectText,
} from './editor-test-support.js';

const DEFAULT_RECTANGLE_DRAFT: RectangleStyleDraft = {
  stroke: '#228833',
  fill: '#1144aa',
  borderWidth: 4,
  opacity: 0.6,
  opacityPattern: /(59|60|61)%/,
};

export function registerEditorPropertyDefaultStyleTests(): void {
  test('rectangle style edits become defaults for newly created rectangles', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargetsOnPage(page, 0);

      await ensureRectangleCreatedOnPage(page, 0, countBefore);

      await ensureNewestHitTargetOnPageOpensProperties(page, 0);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await applyRectangleStyleDraft(page, DEFAULT_RECTANGLE_DRAFT);
      await assertRectangleStyleDraft(page, DEFAULT_RECTANGLE_DRAFT);

      const countAfterFirst = await countHitTargetsOnPage(page, 0);
      await clearSelectionByClickingBlankPoint(page, 0);
      await expect(propertyPanel).not.toBeVisible();

      await ensureRectangleCreatedOnPage(page, 0, countAfterFirst);

      await ensureNewestHitTargetOnPageOpensProperties(page, 0);
      await assertRectangleStyleDraft(page, DEFAULT_RECTANGLE_DRAFT);
    });
  });
}
