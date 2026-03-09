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

export function registerEditorRectangleSideSquareResizeTests(): void {
  test('rectangle shift-resize from a side handle produces a square without moving the anchored edge', async ({
    page,
  }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      await selectNewestHitTarget(page);
      const before = await getSelectionOverlayBox(page);
      const beforeCenterY = before.y + before.height / 2;

      await dragSelectionHandle(page, 'e', { x: 80, y: 0 }, { shiftKey: true });

      const after = await getSelectionOverlayBox(page);
      const afterCenterY = after.y + after.height / 2;
      expect(Math.abs(after.width - after.height)).toBeLessThanOrEqual(6);
      expect(after.width).toBeGreaterThan(before.width + 30);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(6);
      expect(Math.abs(afterCenterY - beforeCenterY)).toBeLessThanOrEqual(6);
    });
  });
}
