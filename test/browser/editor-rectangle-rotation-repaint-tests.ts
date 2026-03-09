import { expect, test } from '@playwright/test';
import { resizeRotatedRectangleAndAssertRepaint } from './editor-rectangle-rotation-repaint-support.js';
import {
  countHitTargets,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  rotateViewerClockwise,
  selectNewestHitTarget,
  switchToEditor,
  switchToTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorRectangleRotationRepaintTests(): void {
  test('rectangle creation and resize repaint correctly after clockwise rotation', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      await rotateViewerClockwise(page, 1);
      await switchToViewerSelectText(page);
      const countBefore = await countHitTargets(page);

      await switchToTool(page, 'Rectangle');
      await drawRectangle(page);
      await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);

      const target = await selectNewestHitTarget(page);
      await resizeRotatedRectangleAndAssertRepaint(page, target);
    });
  });
}
