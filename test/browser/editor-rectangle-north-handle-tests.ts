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

export function registerEditorRectangleNorthHandleTests(): void {
  test('rectangle north-handle resize changes top edge while preserving bottom edge', async ({ page }) => {
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
      const beforeBottom = before.y + before.height;

      await dragSelectionHandle(page, 'n', { x: 0, y: -70 });
      await expect
        .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
        .toBeGreaterThan(before.height + 30);

      const after = await getSelectionOverlayBox(page);
      const afterBottom = after.y + after.height;
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(6);
      expect(Math.abs(afterBottom - beforeBottom)).toBeLessThanOrEqual(6);
    });
  });
}
