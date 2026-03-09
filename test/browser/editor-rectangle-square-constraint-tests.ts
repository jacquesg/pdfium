import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangleOnPage,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleSquareConstraintTests(): void {
  test('shift-constrained rectangle creation produces a square selection box', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangleOnPage(page, 0, { shiftKey: true });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const squareOverlay = page.locator('[data-testid="selection-overlay"]');
      const squareBox = await squareOverlay.boundingBox();
      expect(squareBox).not.toBeNull();
      const squareDelta = Math.abs((squareBox?.width ?? 0) - (squareBox?.height ?? 0));
      expect(squareDelta).toBeLessThanOrEqual(4);
    });
  });
}
