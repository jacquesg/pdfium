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

export function registerEditorRectangleSouthHandleTests(): void {
  test('rectangle south-handle resize changes bottom edge while preserving top edge', async ({ page }) => {
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

      await dragSelectionHandle(page, 's', { x: 0, y: 70 });
      await expect
        .poll(async () => (await getSelectionOverlayBox(page)).height, { timeout: 10_000 })
        .toBeGreaterThan(before.height + 30);

      const after = await getSelectionOverlayBox(page);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(6);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(6);
    });
  });
}
