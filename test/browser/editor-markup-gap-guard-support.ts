import { expect, test } from '@playwright/test';
import { resolveMarkupGapPoint } from './editor-markup-gap-point.js';
import {
  clearSelectionByClickingBlankPoint,
  clickReachableLocator,
  countHitTargets,
  editorBtn,
  expectNoPageErrors,
  getHitTargetIndices,
  HIT_TARGET_SELECTOR,
  selectTextAcrossTwoLinesOnFirstPage,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerMarkupGapSelectionGuard(
  toolLabel: 'Highlight' | 'Underline' | 'Strikeout',
  testName: string,
): void {
  test(testName, async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await selectTextAcrossTwoLinesOnFirstPage(page);
      await switchToTool(page, toolLabel);
      await expect(editorBtn(page, 'Undo')).toBeEnabled({ timeout: 10_000 });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore + 1);

      const indices = await getHitTargetIndices(page);
      expect(indices.length).toBeGreaterThan(0);
      const newestIndex = Math.max(...indices);
      const segmentTargets = page.locator(`${HIT_TARGET_SELECTOR}[data-annotation-index="${String(newestIndex)}"]`);
      await expect(segmentTargets).toHaveCount(2);

      await clickReachableLocator(page, segmentTargets.first());
      await expect(page.locator('[data-testid="selection-markup-overlay"]')).toBeVisible();

      const firstBox = await segmentTargets.nth(0).boundingBox();
      const secondBox = await segmentTargets.nth(1).boundingBox();
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();

      const gapPoint = resolveMarkupGapPoint(firstBox!, secondBox!);

      await clearSelectionByClickingBlankPoint(page, 0);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

      await page.mouse.click(gapPoint.x, gapPoint.y);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="annotation-property-panel"]')).toHaveCount(0);
    });
  });
}
