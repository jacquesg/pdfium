import { expect, test } from '@playwright/test';
import {
  applyRectangleStyleDraft,
  assertRectangleStyleDraft,
  type RectangleStyleDraft,
} from './editor-rectangle-style-support.js';
import {
  clearSelectionByClickingBlankPoint,
  clickReachableLocator,
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

const SHAPE_PERSISTENCE_DRAFT: RectangleStyleDraft = {
  stroke: '#00ff00',
  fill: '#0000ff',
  borderWidth: 3,
  opacity: 0.4,
  opacityPattern: /(39|40|41)%/,
};

export function registerEditorPropertyShapePersistenceTests(): void {
  test('shape property edits persist for stroke, fill, and opacity', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const propertyPanel = page.locator('[data-testid="annotation-property-panel"]');
      await applyRectangleStyleDraft(page, SHAPE_PERSISTENCE_DRAFT);
      await assertRectangleStyleDraft(page, SHAPE_PERSISTENCE_DRAFT);

      await clearSelectionByClickingBlankPoint(page, 0);
      await expect(propertyPanel).not.toBeVisible();

      await clickReachableLocator(page, target);
      await assertRectangleStyleDraft(page, SHAPE_PERSISTENCE_DRAFT);
    });
  });
}
