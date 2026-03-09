import { expect, test } from '@playwright/test';
import {
  resizeZoomedRectangleAndAssertPersistence,
  zoomViewerAndReselectRectangle,
} from './editor-rectangle-zoom-support.js';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleZoomCreationTests(): void {
  test('rectangle creation and resize remain stable at zoomed scale', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const beforeWidth = await zoomViewerAndReselectRectangle(page, target);
      await resizeZoomedRectangleAndAssertPersistence(page, target, beforeWidth);
    });
  });
}
