import { expect, test } from '@playwright/test';
import {
  countHitTargets,
  drawRectangle,
  editorBtn,
  expectNoPageErrors,
  isViewerSelectTextActive,
  switchToEditor,
  switchToTool,
  switchToViewerHandTool,
  switchToViewerSelectText,
} from './editor-test-support.js';

export function registerEditorModeSwitchStabilityTests(): void {
  test('repeated hand/pointer/editor tool switching stays stable', async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await switchToEditor(page);
      const countBefore = await countHitTargets(page);

      for (let i = 0; i < 3; i++) {
        await switchToViewerHandTool(page);
        await expect.poll(() => countHitTargets(page)).toBe(0);

        await switchToTool(page, 'Rectangle');
        await drawRectangle(page);
        await expect(editorBtn(page, 'Rectangle')).toHaveAttribute('aria-pressed', 'false');
        await expect.poll(async () => isViewerSelectTextActive(page)).toBe(true);
      }

      await switchToViewerSelectText(page);
      await expect.poll(() => countHitTargets(page)).toBeGreaterThan(countBefore);
    });
  });
}
