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

export function registerEditorCircleConstraintTests(): void {
  test('shift-constrained circle creation produces a square selection box', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Circle');
      await drawRectangleOnPage(page, 0, { shiftKey: true });
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
      await selectNewestHitTarget(page);

      const circleOverlay = page.locator('[data-testid="selection-overlay"]');
      const circleBox = await circleOverlay.boundingBox();
      expect(circleBox).not.toBeNull();
      const circleDelta = Math.abs((circleBox?.width ?? 0) - (circleBox?.height ?? 0));
      expect(circleDelta).toBeLessThanOrEqual(4);
    });
  });
}
