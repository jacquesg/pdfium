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

export function registerEditorRectangleWestHandleTests(): void {
  test('rectangle west-handle resize changes width while preserving right edge', async ({ page }) => {
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
      const beforeRight = before.x + before.width;

      await dragSelectionHandle(page, 'w', { x: -70, y: 0 });
      await expect
        .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
        .toBeGreaterThan(before.width + 30);

      const after = await getSelectionOverlayBox(page);
      const afterRight = after.x + after.width;
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(6);
      expect(Math.abs(afterRight - beforeRight)).toBeLessThanOrEqual(6);
    });
  });
}
