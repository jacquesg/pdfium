import { expect, test } from '@playwright/test';
import {
  clickBlankPointOnPage,
  clickReachableLocator,
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

export function registerEditorCircleEastResizeTests(): void {
  test('circle east-handle resize changes width while preserving height', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Circle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      const before = await getSelectionOverlayBox(page);

      await dragSelectionHandle(page, 'e', { x: 80, y: 0 });
      await expect
        .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
        .toBeGreaterThan(before.width + 40);

      const after = await getSelectionOverlayBox(page);
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(6);

      await clickBlankPointOnPage(page, 0);
      await expect(page.locator('[data-testid="selection-overlay"]')).toHaveCount(0);

      await clickReachableLocator(page, target);
      await expect
        .poll(async () => (await getSelectionOverlayBox(page)).width, { timeout: 10_000 })
        .toBeGreaterThan(before.width + 40);
      const persisted = await getSelectionOverlayBox(page);
      expect(persisted.width).toBeGreaterThan(before.width + 40);
      expect(Math.abs(persisted.height - before.height)).toBeLessThanOrEqual(6);
    });
  });
}
