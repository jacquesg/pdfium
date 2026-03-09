import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  dragSelectionHandle,
  drawRectangle,
  expectNoPageErrors,
  getSelectionOverlayBox,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorCircleSquarePreviewTests(): void {
  test('circle shift-resize from a corner handle produces a circle preview and commit', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Circle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);

      await dragSelectionHandle(page, 'se', { x: 70, y: 20 }, { shiftKey: true });
      const after = await getSelectionOverlayBox(page);
      expect(Math.abs(after.width - after.height)).toBeLessThanOrEqual(6);
    });
  });
}
