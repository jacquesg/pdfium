import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  expectNoPageErrors,
  getPageCanvasDataUrl,
  selectNewestHitTarget,
  setNumberInput,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
  waitForCanvasStable,
} from './editor-test-support.js';

export function registerEditorRectangleBorderRepaintTests(): void {
  test('changing rectangle border width repaints canvas without opacity change', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
      await selectNewestHitTarget(page);

      const borderWidthInput = page.locator('[data-testid="border-width-input"]');
      await expect(borderWidthInput).toBeVisible();
      const beforeCanvas = await waitForCanvasStable(page);

      await setNumberInput(borderWidthInput, 5);
      await expect.poll(async () => await getPageCanvasDataUrl(page), { timeout: 10_000 }).not.toBe(beforeCanvas);
    });
  });
}
